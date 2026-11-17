use reqwest::{Method, Response};
use serde_json::Value;
use sqlx::{AssertSqlSafe, Connection};

use crate::support::{CreatedTenant, TestResult, TestServer};

/// Credentials of a Data API request: an API key, and a user's access token when there is one.
#[derive(Clone, Copy)]
pub struct Credentials<'a> {
    pub api_key: &'a str,
    pub access_token: Option<&'a str>,
}

impl<'a> Credentials<'a> {
    pub fn anonymous(tenant: &'a CreatedTenant) -> Self {
        Self {
            api_key: &tenant.publishable_key,
            access_token: None,
        }
    }

    pub fn user(tenant: &'a CreatedTenant, access_token: &'a str) -> Self {
        Self {
            api_key: &tenant.publishable_key,
            access_token: Some(access_token),
        }
    }

    pub fn service(tenant: &'a CreatedTenant) -> Self {
        Self {
            api_key: &tenant.secret_key,
            access_token: None,
        }
    }
}

/// A Data API request: `path` starts after `/rest/v1`.
pub struct RestRequest<'a> {
    pub method: Method,
    pub path: &'a str,
    pub body: Option<Value>,
    pub prefer: Option<&'a str>,
}

impl<'a> RestRequest<'a> {
    pub fn get(path: &'a str) -> Self {
        Self {
            method: Method::GET,
            path,
            body: None,
            prefer: None,
        }
    }

    pub fn with_body(method: Method, path: &'a str, body: Value) -> Self {
        Self {
            method,
            path,
            body: Some(body),
            prefer: None,
        }
    }

    pub fn prefer(self, prefer: &'a str) -> Self {
        Self {
            prefer: Some(prefer),
            ..self
        }
    }
}

pub async fn rest(
    server: &TestServer,
    credentials: Credentials<'_>,
    request: RestRequest<'_>,
) -> TestResult<Response> {
    let url = server.url(&format!("/rest/v1{}", request.path));
    let mut builder = server
        .client
        .request(request.method, url)
        .header("apikey", credentials.api_key);

    if let Some(access_token) = credentials.access_token {
        builder = builder.bearer_auth(access_token);
    }

    if let Some(prefer) = request.prefer {
        builder = builder.header("prefer", prefer);
    }

    if let Some(body) = request.body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

/// `GET` answering the JSON body; fails on an error status.
pub async fn rest_json(
    server: &TestServer,
    credentials: Credentials<'_>,
    path: &str,
) -> TestResult<Value> {
    let response = rest(server, credentials, RestRequest::get(path)).await?;

    Ok(response.error_for_status()?.json().await?)
}

/// Runs SQL in the project's database as the developer role, like the console's SQL editor.
pub async fn developer_sql(server: &TestServer, tenant: &CreatedTenant, sql: &str) -> TestResult {
    let mut connection = server.tenant_database(tenant).await?;
    let script = format!("SET ROLE nelcota_developer; SET search_path = public; {sql}");
    sqlx::raw_sql(AssertSqlSafe(script))
        .execute(&mut connection)
        .await?;
    connection.close().await?;

    Ok(())
}
