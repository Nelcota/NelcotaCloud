use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use super::support::{Credentials, RestRequest, developer_sql, rest};
use crate::support::{CreatedTenant, TestResult, TestServer, field};

async fn usage(server: &TestServer, tenant: &CreatedTenant, period: &str) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(&format!("/database/v1/usage?period={period}")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

fn requests_of<'a>(report: &'a Value, list: &str, (key, value): (&str, Value)) -> &'a Value {
    let entry = report
        .get(list)
        .and_then(Value::as_array)
        .and_then(|entries| entries.iter().find(|entry| entry.get(key) == Some(&value)));

    entry.map_or(&Value::Null, |entry| field(entry, "/requests"))
}

#[tokio::test]
async fn data_api_responses_are_counted_per_table_and_status() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE notes (id serial PRIMARY KEY, body text);",
    )
    .await?;
    let service = Credentials::service(&tenant);

    for _ in 0..2 {
        rest(&server, service, RestRequest::get("/notes"))
            .await?
            .error_for_status()?;
    }
    let body = json!({ "body": "hello" });
    rest(
        &server,
        service,
        RestRequest::with_body(Method::POST, "/notes", body),
    )
    .await?
    .error_for_status()?;
    let missing = rest(&server, service, RestRequest::get("/no_such_table")).await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    let day = usage(&server, &tenant, "24h").await?;
    assert_eq!(field(&day, "/requests"), 4);
    assert_eq!(field(&day, "/client_errors"), 1);
    assert_eq!(field(&day, "/server_errors"), 0);
    assert_eq!(requests_of(&day, "resources", ("name", json!("notes"))), 3);
    assert_eq!(requests_of(&day, "resources", ("name", json!(""))), 1);
    assert_eq!(requests_of(&day, "statuses", ("status", json!(404))), 1);
    assert_eq!(requests_of(&day, "methods", ("method", json!("POST"))), 1);
    let hours = field(&day, "/series").as_array().map(Vec::len);
    assert_eq!(hours, Some(24));

    let week = usage(&server, &tenant, "7d").await?;
    assert_eq!(field(&week, "/series").as_array().map(Vec::len), Some(7));
    assert_eq!(field(&week, "/requests"), 4);

    let unknown = server
        .client
        .get(server.url("/database/v1/usage?period=1y"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(unknown.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}
