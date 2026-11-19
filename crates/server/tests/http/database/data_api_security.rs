use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use super::support::{Credentials, RestRequest, developer_sql, rest, rest_json};
use crate::support::{TestResult, TestServer, error_code, unique_email};

const NOTES_TABLE: &str = "
CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    body TEXT NOT NULL
);
CREATE POLICY own_notes ON notes FOR ALL TO nelcota_authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
";

#[tokio::test]
async fn row_level_security_keeps_each_user_to_their_own_rows() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, NOTES_TABLE).await?;
    let ana = server.sign_up(&tenant, &unique_email("ana")).await?;
    let bia = server.sign_up(&tenant, &unique_email("bia")).await?;
    let as_ana = Credentials::user(&tenant, &ana.access_token);
    let as_bia = Credentials::user(&tenant, &bia.access_token);

    let created = rest(
        &server,
        as_ana,
        RestRequest::with_body(Method::POST, "/notes", json!({ "body": "ana's note" }))
            .prefer("return=representation"),
    )
    .await?;
    assert_eq!(created.status(), StatusCode::CREATED);
    let created: Value = created.json().await?;
    assert_eq!(created.pointer("/0/user_id"), Some(&json!(ana.user.id)));

    assert_eq!(
        rest_json(&server, as_ana, "/notes")
            .await?
            .as_array()
            .map(Vec::len),
        Some(1)
    );
    assert_eq!(rest_json(&server, as_bia, "/notes").await?, json!([]));
    let anonymous = rest_json(&server, Credentials::anonymous(&tenant), "/notes").await?;
    assert_eq!(anonymous, json!([]));
    let everything = rest_json(&server, Credentials::service(&tenant), "/notes").await?;
    assert_eq!(everything.as_array().map(Vec::len), Some(1));

    let forged = rest(
        &server,
        as_bia,
        RestRequest::with_body(
            Method::POST,
            "/notes",
            json!({ "body": "forged", "user_id": ana.user.id }),
        ),
    )
    .await?;
    assert_eq!(forged.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(forged).await?, "permission_denied");

    let stolen_update = rest(
        &server,
        as_bia,
        RestRequest::with_body(Method::PATCH, "/notes?id=gt.0", json!({ "body": "mine" })),
    )
    .await?;
    assert_eq!(stolen_update.status(), StatusCode::NO_CONTENT);
    let still_ana: Value = rest_json(&server, as_ana, "/notes?select=body").await?;
    assert_eq!(still_ana, json!([{ "body": "ana's note" }]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn new_tables_are_closed_until_a_policy_opens_them() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE plans (name TEXT PRIMARY KEY); INSERT INTO plans VALUES ('free');",
    )
    .await?;
    let anonymous = Credentials::anonymous(&tenant);

    assert_eq!(rest_json(&server, anonymous, "/plans").await?, json!([]));

    developer_sql(
        &server,
        &tenant,
        "CREATE POLICY public_plans ON plans FOR SELECT TO nelcota_anon USING (true);",
    )
    .await?;
    assert_eq!(
        rest_json(&server, anonymous, "/plans").await?,
        json!([{ "name": "free" }])
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn auth_tables_and_unknown_names_are_out_of_reach() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    server.sign_up(&tenant, &unique_email("hidden")).await?;
    let service = Credentials::service(&tenant);

    for path in ["/users", "/refresh_tokens", "/schema_version"] {
        let response = rest(&server, service, RestRequest::get(path)).await?;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
        assert_eq!(error_code(response).await?, "table_not_found");
    }

    developer_sql(&server, &tenant, "CREATE TABLE items (id INT PRIMARY KEY);").await?;
    for path in [
        "/items?select=id;drop",
        "/items?id;drop=eq.1",
        "/items?missing=eq.1",
        "/items?id=between.1",
    ] {
        let response = rest(&server, service, RestRequest::get(path)).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}");
    }

    let invalid_token = Credentials {
        api_key: &tenant.publishable_key,
        access_token: Some("not-a-token"),
    };
    let refused = rest(&server, invalid_token, RestRequest::get("/items")).await?;
    assert_eq!(refused.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_developer_role_cannot_escape_the_project() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for statement in [
        "SELECT count(*) FROM auth.users;",
        "COPY (SELECT 1) TO PROGRAM 'echo hi';",
        "CREATE SCHEMA other;",
    ] {
        let outcome = developer_sql(&server, &tenant, statement).await;
        assert!(outcome.is_err(), "{statement} should be refused");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn apps_are_rate_limited_per_client() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, "CREATE TABLE pings (id INT PRIMARY KEY);").await?;
    let mut limited_after = None;

    for attempt in 0..2_000 {
        let response = rest(
            &server,
            Credentials::anonymous(&tenant),
            RestRequest::get("/pings"),
        )
        .await?;

        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            limited_after = Some(attempt);
            break;
        }
    }

    assert!(limited_after.is_some_and(|attempt| attempt >= 300));
    let service = rest(
        &server,
        Credentials::service(&tenant),
        RestRequest::get("/pings"),
    )
    .await?;
    assert_eq!(service.status(), StatusCode::OK);

    server.drop_tenant(&tenant).await
}
