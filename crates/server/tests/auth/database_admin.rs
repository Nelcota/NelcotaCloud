use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};

use crate::database_support::{Credentials, RestRequest, rest, rest_json};
use crate::support::{
    CreatedTenant, TEST_SITE_URL, TestResult, TestServer, error_code, field, random_slug,
    unique_email,
};

async fn admin(
    server: &TestServer,
    tenant: &CreatedTenant,
    request: (Method, &str, Option<Value>),
) -> TestResult<Response> {
    let (method, path, body) = request;
    let mut builder = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.secret_key);

    if let Some(body) = body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

async fn run_sql(server: &TestServer, tenant: &CreatedTenant, query: &str) -> TestResult<Response> {
    let body = json!({ "query": query });

    admin(
        server,
        tenant,
        (Method::POST, "/database/v1/sql", Some(body)),
    )
    .await
}

fn table<'a>(schema: &'a Value, name: &str) -> Option<&'a Value> {
    schema
        .get("tables")?
        .as_array()?
        .iter()
        .find(|table| table.get("name") == Some(&json!(name)))
}

#[tokio::test]
async fn sql_editor_does_not_reuse_developer_sessions() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let query = "SELECT pg_backend_pid() AS pid";
    let first: Value = run_sql(&server, &tenant, query)
        .await?
        .error_for_status()?
        .json()
        .await?;
    let next: Value = run_sql(&server, &tenant, query)
        .await?
        .error_for_status()?
        .json()
        .await?;

    assert_ne!(field(&first, "/rows/0/0"), field(&next, "/rows/0/0"));
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn manages_tables_columns_and_policies() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let todos = json!({
        "name": "todos",
        "columns": [
            { "name": "id", "type": "bigint", "identity": true, "primary_key": true },
            { "name": "owner_id", "type": "uuid", "default": "auth.uid()" },
            { "name": "title", "type": "text" },
            { "name": "done", "type": "boolean", "default": "false" }
        ]
    });

    let created = admin(
        &server,
        &tenant,
        (Method::POST, "/database/v1/tables", Some(todos)),
    )
    .await?;
    assert_eq!(created.status(), StatusCode::CREATED);
    let column = json!({ "name": "due_on", "type": "date", "nullable": true });
    let added = admin(
        &server,
        &tenant,
        (
            Method::POST,
            "/database/v1/tables/todos/columns",
            Some(column),
        ),
    )
    .await?;
    assert_eq!(added.status(), StatusCode::CREATED);
    let policy = json!({
        "name": "own_todos",
        "command": "all",
        "roles": ["authenticated"],
        "using": "owner_id = auth.uid()",
        "with_check": "owner_id = auth.uid()"
    });
    let policy_created = admin(
        &server,
        &tenant,
        (
            Method::POST,
            "/database/v1/tables/todos/policies",
            Some(policy),
        ),
    )
    .await?;
    assert_eq!(policy_created.status(), StatusCode::CREATED);

    let schema: Value = admin(&server, &tenant, (Method::GET, "/database/v1/schema", None))
        .await?
        .json()
        .await?;
    let todos = table(&schema, "todos").cloned().unwrap_or_default();
    assert_eq!(field(&todos, "/rls_enabled"), true);
    assert_eq!(field(&todos, "/columns/0/is_identity"), true);
    assert_eq!(field(&todos, "/columns/0/is_primary_key"), true);
    assert_eq!(field(&todos, "/columns/4/name"), "due_on");
    assert_eq!(
        field(&todos, "/policies/0/roles"),
        &json!(["authenticated"])
    );
    assert_eq!(
        field(&todos, "/policies/0/using"),
        "(owner_id = auth.uid())"
    );

    let user = server.sign_up(&tenant, &unique_email("todo")).await?;
    let as_user = Credentials::user(&tenant, &user.access_token);
    rest(
        &server,
        as_user,
        RestRequest::with_body(Method::POST, "/todos", json!({ "title": "Write tests" })),
    )
    .await?
    .error_for_status()?;
    let own = rest_json(&server, as_user, "/todos?select=title,done").await?;
    assert_eq!(own, json!([{ "title": "Write tests", "done": false }]));

    for path in [
        "/database/v1/tables/todos/policies/own_todos",
        "/database/v1/tables/todos/columns/due_on",
        "/database/v1/tables/todos",
    ] {
        let removed = admin(&server, &tenant, (Method::DELETE, path, None)).await?;
        assert_eq!(removed.status(), StatusCode::NO_CONTENT, "{path}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_definitions_with_postgres_messages() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let invalid_tables = [
        json!({ "name": "Bad Name", "columns": [{ "name": "id", "type": "int" }] }),
        json!({ "name": "items", "columns": [{ "name": "id", "type": "serial" }] }),
        json!({ "name": "items", "columns": [] }),
    ];

    for body in invalid_tables {
        let response = admin(
            &server,
            &tenant,
            (Method::POST, "/database/v1/tables", Some(body)),
        )
        .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    let missing_reference = json!({
        "name": "items",
        "columns": [{ "name": "owner", "type": "bigint", "references": { "table": "nowhere", "column": "id" } }]
    });
    let refused = admin(
        &server,
        &tenant,
        (Method::POST, "/database/v1/tables", Some(missing_reference)),
    )
    .await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    let refused: Value = refused.json().await?;
    assert_eq!(field(&refused, "/error"), "sql_error");
    assert!(
        field(&refused, "/message")
            .as_str()
            .unwrap_or_default()
            .contains("nowhere")
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_sql_editor_runs_scripts_as_the_developer_role() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let result: Value = run_sql(
        &server,
        &tenant,
        "CREATE TABLE numbers (n INT); INSERT INTO numbers SELECT generate_series(1, 1500); \
         SELECT n, n * 2 AS double FROM numbers ORDER BY n;",
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    assert_eq!(field(&result, "/columns"), &json!(["n", "double"]));
    assert_eq!(field(&result, "/rows/0"), &json!(["1", "2"]));
    assert_eq!(field(&result, "/row_count"), 1500);
    assert_eq!(field(&result, "/rows_affected"), 1500 + 1500);
    assert_eq!(field(&result, "/is_truncated"), true);
    assert_eq!(field(&result, "/rows").as_array().map(Vec::len), Some(1000));

    for escape in [
        "SELECT count(*) FROM auth.users",
        "RESET ROLE; SELECT count(*) FROM auth.users",
        "SET ROLE nelcota_service; SELECT count(*) FROM auth.users",
        "COPY (SELECT 1) TO PROGRAM 'echo hi'",
        "CREATE EXTENSION dblink",
        "ALTER ROLE nelcota_developer SUPERUSER",
    ] {
        let response = run_sql(&server, &tenant, escape).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{escape}");
        assert_eq!(error_code(response).await?, "sql_error");
    }

    let slow = run_sql(&server, &tenant, "SELECT pg_sleep(30)").await?;
    assert_eq!(slow.status(), StatusCode::GATEWAY_TIMEOUT);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn console_accounts_reach_their_projects_data() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("stranger"))
        .await?;
    let body = json!({ "slug": random_slug(), "name": "Data", "site_url": TEST_SITE_URL });
    let created: Value = server
        .client
        .post(server.url("/platform/v1/projects"))
        .bearer_auth(&owner.access_token)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let project_id = field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned();
    let console_request = |token: &str, method: Method, path: &str| {
        server
            .client
            .request(method, server.url(path))
            .bearer_auth(token)
            .header("x-nelcota-project", &project_id)
    };

    console_request(&owner.access_token, Method::POST, "/database/v1/sql")
        .json(
            &json!({ "query": "CREATE TABLE secrets (v TEXT); INSERT INTO secrets VALUES ('x');" }),
        )
        .send()
        .await?
        .error_for_status()?;
    let rows: Value = console_request(&owner.access_token, Method::GET, "/rest/v1/secrets")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(rows, json!([{ "v": "x" }]));

    let refused = console_request(&stranger.access_token, Method::GET, "/rest/v1/secrets")
        .send()
        .await?;
    assert_eq!(refused.status(), StatusCode::FORBIDDEN);

    server
        .client
        .delete(server.url(&format!("/platform/v1/projects/{project_id}")))
        .bearer_auth(&owner.access_token)
        .send()
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn sql_falling_back_to_the_login_role_stays_in_the_project() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let neighbour = server.create_tenant().await?;
    run_sql(&server, &neighbour, "CREATE TABLE items (id integer)")
        .await?
        .error_for_status()?;
    // A Data API request leaves an idle connection under the neighbour's login role.
    let rows = rest_json(&server, Credentials::service(&neighbour), "/items").await?;
    assert_eq!(rows, json!([]));

    let fallen_back: Value = run_sql(&server, &tenant, "RESET ROLE; SELECT current_user AS who")
        .await?
        .error_for_status()?
        .json()
        .await?;
    let expected_role = format!("nelcota_t_{}", tenant.slug);
    assert_eq!(field(&fallen_back, "/rows/0/0"), expected_role.as_str());

    let others = format!(
        "RESET ROLE; SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
         WHERE usename = 'nelcota_t_{}'",
        neighbour.slug
    );
    let refused = run_sql(&server, &tenant, &others).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    let after_commit: Value = run_sql(
        &server,
        &tenant,
        "COMMIT; SELECT count(*) AS visible FROM pg_stat_activity \
         WHERE usename <> current_user AND query <> '<insufficient privilege>' \
         AND usename LIKE 'nelcota_t_%'",
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    assert_eq!(field(&after_commit, "/rows/0/0"), "0");

    server.drop_tenant(&neighbour).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn views_never_expose_rows_their_policies_hide() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    run_sql(
        &server,
        &tenant,
        "CREATE TABLE secrets (v TEXT); INSERT INTO secrets VALUES ('x');
         CREATE VIEW secret_view AS SELECT * FROM secrets;
         CREATE MATERIALIZED VIEW secret_copy AS SELECT * FROM secrets;",
    )
    .await?
    .error_for_status()?;
    let anonymous = Credentials::anonymous(&tenant);

    assert_eq!(
        rest_json(&server, anonymous, "/secret_view").await?,
        json!([])
    );
    let copy = rest(&server, anonymous, RestRequest::get("/secret_copy")).await?;
    assert_eq!(copy.status(), StatusCode::FORBIDDEN);

    server.drop_tenant(&tenant).await
}
