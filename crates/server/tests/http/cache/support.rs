use reqwest::{Method, Response};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, Session, TEST_SITE_URL, TestResult, TestServer, random_slug};

pub const CACHE_KEY: &str = "products:123";

pub struct CacheProject<'a> {
    pub server: &'a TestServer,
    pub owner: &'a Session,
    pub project: CreatedTenant,
}

#[derive(Deserialize)]
pub struct TestCredential {
    pub id: String,
    pub token: String,
}

impl<'a> CacheProject<'a> {
    pub async fn create(server: &'a TestServer, owner: &'a Session) -> TestResult<Self> {
        let request =
            json!({ "slug": random_slug(), "name": "Cache test", "site_url": TEST_SITE_URL });
        let project = server
            .client
            .post(server.url("/platform/v1/projects"))
            .bearer_auth(&owner.access_token)
            .json(&request)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(Self {
            server,
            owner,
            project,
        })
    }

    pub async fn manage(
        &self,
        method: Method,
        request: (&str, Option<Value>),
    ) -> TestResult<Response> {
        let (suffix, body) = request;
        let id = self.project.tenant_id;
        let path = format!("/platform/v1/projects/{id}/cache{suffix}");
        let mut call = self
            .server
            .client
            .request(method, self.server.url(&path))
            .bearer_auth(&self.owner.access_token);

        if let Some(body) = body {
            call = call.json(&body);
        }

        Ok(call.send().await?)
    }

    pub async fn set_enabled(&self, enabled: bool) -> TestResult {
        self.manage(Method::PUT, ("", Some(json!({ "enabled": enabled }))))
            .await?
            .error_for_status()?;

        Ok(())
    }

    pub async fn issue(&self) -> TestResult<TestCredential> {
        let response = self
            .manage(
                Method::POST,
                ("/credentials", Some(json!({ "name": "Backend" }))),
            )
            .await?;
        assert_eq!(response.status(), reqwest::StatusCode::CREATED);

        Ok(response.json().await?)
    }

    pub async fn drop(self) -> TestResult {
        let id = self.project.tenant_id;
        let path = format!("/platform/v1/projects/{id}");
        self.server
            .client
            .delete(self.server.url(&path))
            .bearer_auth(&self.owner.access_token)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }
}

pub async fn cache_request(
    server: &TestServer,
    token: &str,
    request: (&str, Value),
) -> TestResult<Response> {
    let (operation, body) = request;
    let path = format!("/cache/v1/{operation}");

    Ok(server
        .client
        .post(server.url(&path))
        .bearer_auth(token)
        .json(&body)
        .send()
        .await?)
}
