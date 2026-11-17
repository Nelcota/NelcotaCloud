use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use crate::database_support::{Credentials, RestRequest, developer_sql, rest};
use crate::support::{TestResult, TestServer, error_code};

const FUNCTIONS: &str = "
CREATE FUNCTION add_numbers(a INT, b INT DEFAULT 10) RETURNS INT
    LANGUAGE sql IMMUTABLE AS $$ SELECT a + b $$;
CREATE FUNCTION series(upto INT) RETURNS TABLE (n INT)
    LANGUAGE sql STABLE AS $$ SELECT generate_series(1, upto) $$;
CREATE FUNCTION sum_all(numbers INT[]) RETURNS INT
    LANGUAGE sql IMMUTABLE AS $$ SELECT sum(x)::int FROM unnest(numbers) x $$;
CREATE FUNCTION refuse(reason TEXT) RETURNS void
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '%', reason; END $$;
CREATE FUNCTION whoami() RETURNS TEXT
    LANGUAGE sql STABLE AS $$ SELECT auth.role() $$;
CREATE FUNCTION endless() RETURNS void
    LANGUAGE plpgsql AS $$
    BEGIN
        PERFORM set_config('statement_timeout', '0', true);
        PERFORM pg_sleep(60);
    END $$;
";

async fn call(
    server: &TestServer,
    credentials: Credentials<'_>,
    path: &str,
    body: Value,
) -> TestResult<reqwest::Response> {
    rest(
        server,
        credentials,
        RestRequest::with_body(Method::POST, path, body),
    )
    .await
}

#[tokio::test]
async fn calls_functions_with_named_arguments() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, FUNCTIONS).await?;
    let anonymous = Credentials::anonymous(&tenant);
    let cases = [
        ("/rpc/add_numbers", json!({ "a": 1, "b": 2 }), json!(3)),
        ("/rpc/add_numbers", json!({ "a": 1 }), json!(11)),
        ("/rpc/series", json!({ "upto": 3 }), json!([1, 2, 3])),
        ("/rpc/sum_all", json!({ "numbers": [1, 2, 3] }), json!(6)),
        ("/rpc/whoami", json!({}), json!("anon")),
    ];

    for (path, arguments, expected) in cases {
        let response = call(&server, anonymous, path, arguments).await?;
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        let result: Value = response.json().await?;
        assert_eq!(result, expected, "{path}");
    }

    let raised = call(
        &server,
        anonymous,
        "/rpc/refuse",
        json!({ "reason": "out of stock" }),
    )
    .await?;
    assert_eq!(raised.status(), StatusCode::BAD_REQUEST);
    let raised: Value = raised.json().await?;
    assert_eq!(raised.get("message"), Some(&json!("out of stock")));

    let missing = call(&server, anonymous, "/rpc/add_numbers", json!({ "c": 1 })).await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    assert_eq!(error_code(missing).await?, "function_not_found");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn cancels_queries_that_outlive_their_timeout() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, FUNCTIONS).await?;

    let slow = call(
        &server,
        Credentials::anonymous(&tenant),
        "/rpc/endless",
        json!({}),
    )
    .await?;
    assert_eq!(slow.status(), StatusCode::GATEWAY_TIMEOUT);
    assert_eq!(error_code(slow).await?, "query_timeout");

    let still_works = call(
        &server,
        Credentials::anonymous(&tenant),
        "/rpc/add_numbers",
        json!({ "a": 1 }),
    )
    .await?;
    assert_eq!(still_works.status(), StatusCode::OK);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_responses_larger_than_the_limit() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE FUNCTION huge() RETURNS TEXT LANGUAGE sql AS $$ SELECT repeat('x', 17000000) $$;",
    )
    .await?;

    let response = call(
        &server,
        Credentials::service(&tenant),
        "/rpc/huge",
        json!({}),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_code(response).await?, "response_too_large");

    server.drop_tenant(&tenant).await
}
