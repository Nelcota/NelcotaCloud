use std::str::FromStr;

use reqwest::{Method, Response, StatusCode};
use serde_json::Value;
use sqlx::postgres::PgConnectOptions;
use sqlx::{Connection, PgConnection};

use crate::support::{CreatedTenant, TestResult, TestServer, field};

async fn call(server: &TestServer, tenant: &CreatedTenant, method: Method) -> TestResult<Response> {
    let path = match method {
        Method::POST => "/database/v1/connection/password",
        _ => "/database/v1/connection",
    };
    let response = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn new_password(server: &TestServer, tenant: &CreatedTenant) -> TestResult<String> {
    let response = call(server, tenant, Method::POST).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let body: Value = response.json().await?;
    let connection_string = field(&body, "/connection_string")
        .as_str()
        .ok_or("no connection string")?
        .to_owned();
    assert!(connection_string.contains(&format!("@db.nelcota.test:6543/tenant_{}", tenant.slug)));
    assert!(connection_string.ends_with("?sslmode=require"));
    let password = field(&body, "/password").as_str().ok_or("no password")?;

    Ok(password.to_owned())
}

/// Connects the way an ORM would, straight to Postgres (the pooler is not part of the tests).
async fn connect_as(database: &str, user: &str, password: &str) -> TestResult<PgConnection> {
    let base_url = std::env::var("TENANT_DATABASE_BASE_URL")?;
    let options = PgConnectOptions::from_str(&base_url)?
        .database(database)
        .username(user)
        .password(password);

    Ok(PgConnection::connect_with(&options).await?)
}

/// The details come without a password until one is set, and the role is the project's own.
#[tokio::test]
async fn connection_details_name_the_projects_role_and_database() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let response = call(&server, &tenant, Method::GET).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let details: Value = response.json().await?;

    assert_eq!(field(&details, "/enabled"), true);
    assert_eq!(field(&details, "/host"), "db.nelcota.test");
    assert_eq!(field(&details, "/port"), 6543);
    assert_eq!(
        field(&details, "/user"),
        format!("nelcota_c_{}", tenant.slug).as_str()
    );
    assert_eq!(
        field(&details, "/database"),
        format!("tenant_{}", tenant.slug).as_str()
    );
    assert_eq!(field(&details, "/has_password"), false);
    server.drop_tenant(&tenant).await
}

/// The password logs in as the project's developer, in its own database only, and a new
/// password retires the old one.
#[tokio::test]
async fn a_new_password_connects_as_the_developer_of_that_project_only() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let other = server.create_tenant().await?;
    let user = format!("nelcota_c_{}", tenant.slug);
    let database = format!("tenant_{}", tenant.slug);
    let password = new_password(&server, &tenant).await?;

    let mut connection = connect_as(&database, &user, &password).await?;
    let role: String = sqlx::query_scalar("SELECT current_user::text")
        .fetch_one(&mut connection)
        .await?;
    sqlx::raw_sql("CREATE TABLE orm_made (id int primary key)")
        .execute(&mut connection)
        .await?;
    connection.close().await?;
    assert_eq!(role, "nelcota_developer");

    let elsewhere = connect_as(&format!("tenant_{}", other.slug), &user, &password).await;
    assert!(elsewhere.is_err());

    let details: Value = call(&server, &tenant, Method::GET).await?.json().await?;
    assert_eq!(field(&details, "/has_password"), true);
    let replaced = new_password(&server, &tenant).await?;
    assert!(connect_as(&database, &user, &password).await.is_err());
    connect_as(&database, &user, &replaced)
        .await?
        .close()
        .await?;

    server.drop_tenant(&other).await?;
    server.drop_tenant(&tenant).await
}
