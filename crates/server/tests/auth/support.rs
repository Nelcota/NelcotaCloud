use std::error::Error;
use std::future::IntoFuture;
use std::net::SocketAddr;
use std::time::Duration;

use reqwest::{Client, Response};
use serde::Deserialize;
use serde_json::{Value, json};
use server::app_config::AppConfig;
use server::modules::oauth::provider::provider_endpoints::{OAuthEndpoints, ProviderEndpoints};
use server::router::build_router;
use server::shared::crypto::hex_encoding::encode_hex;
use server::shared::crypto::random_bytes::random_bytes;
use server::startup::app_state_builder::build_app_state_with_endpoints;
use sqlx::{AssertSqlSafe, Connection, PgConnection};
use tokio::net::TcpListener;
use uuid::Uuid;

use crate::fake_github::FakeGitHub;

pub type TestResult<T = ()> = Result<T, Box<dyn Error>>;

const SECRET_BYTES: usize = 32;
const SLUG_SUFFIX_BYTES: usize = 6;
const EMAIL_SUFFIX_BYTES: usize = 6;
const MAIL_POLL_ATTEMPTS: u32 = 50;
const MAIL_POLL_INTERVAL: Duration = Duration::from_millis(100);
pub const TEST_PASSWORD: &str = "correct horse battery";
pub const TEST_SITE_URL: &str = "http://app.test";

#[derive(Debug, Deserialize)]
pub struct CreatedTenant {
    pub tenant_id: Uuid,
    pub slug: String,
    pub publishable_key: String,
    pub secret_key: String,
}

#[derive(Debug, Deserialize)]
pub struct SessionUser {
    pub id: Uuid,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct Session {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: SessionUser,
}

#[derive(Debug, Deserialize)]
pub struct ErrorBody {
    pub error: String,
}

/// A real server on a free local port, with its own random master key and admin token.
pub struct TestServer {
    pub client: Client,
    pub fake_github: FakeGitHub,
    /// Slug the server treats as the platform tenant; created on demand by tests.
    pub platform_slug: String,
    base_url: String,
    admin_token: String,
    mailpit_api_url: String,
    config: AppConfig,
}

#[derive(Deserialize)]
struct MailpitSearch {
    messages: Vec<MailpitSummary>,
}

#[derive(Deserialize)]
struct MailpitSummary {
    #[serde(rename = "ID")]
    id: String,
}

#[derive(Deserialize)]
struct MailpitMessage {
    #[serde(rename = "Text")]
    text: String,
}

/// Emails are unique per run: Mailpit keeps messages from earlier runs.
pub fn unique_email(prefix: &str) -> String {
    let suffix = encode_hex(&random_bytes::<EMAIL_SUFFIX_BYTES>());

    format!("{prefix}-{suffix}@example.com")
}

impl TestServer {
    pub async fn start() -> TestResult<Self> {
        if let Err(error) = dotenvy::dotenv()
            && error.not_found() == false
        {
            return Err(error.into());
        }

        let admin_token = encode_hex(&random_bytes::<SECRET_BYTES>());
        let platform_slug = random_slug();
        let config = AppConfig {
            control_plane_database_url: std::env::var("CONTROL_PLANE_DATABASE_URL")?,
            tenant_database_base_url: std::env::var("TENANT_DATABASE_BASE_URL")?,
            master_key_hex: encode_hex(&random_bytes::<SECRET_BYTES>()),
            admin_token: admin_token.clone(),
            public_base_url: "http://auth.test".to_owned(),
            bind_address: "127.0.0.1:0".to_owned(),
            smtp_url: std::env::var("SMTP_URL")?,
            email_from: std::env::var("EMAIL_FROM")?,
            client_ip_header: None,
            tenant_smtp_allow_any_host: Some(true),
            platform_tenant_slug: Some(platform_slug.clone()),
        };
        let fake_github = FakeGitHub::start().await;
        let endpoints = fake_endpoints(&fake_github);
        let state = build_app_state_with_endpoints(&config, endpoints).await?;
        let listener = TcpListener::bind(&config.bind_address).await?;
        let base_url = format!("http://{}", listener.local_addr()?);
        // The task ends with the test's runtime.
        let _server_task = tokio::spawn(
            axum::serve(
                listener,
                build_router(state).into_make_service_with_connect_info::<SocketAddr>(),
            )
            .into_future(),
        );

        let client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()?;

        Ok(Self {
            client,
            fake_github,
            platform_slug,
            base_url,
            admin_token,
            mailpit_api_url: std::env::var("MAILPIT_API_URL")?,
            config,
        })
    }

    pub fn admin_token(&self) -> &str {
        &self.admin_token
    }

    pub fn url(&self, path: &str) -> String {
        format!("{}{path}", self.base_url)
    }

    /// Most tests exercise flows where signup logs in directly, so verification is off here.
    pub async fn create_tenant(&self) -> TestResult<CreatedTenant> {
        let body = json!({
            "slug": random_slug(),
            "name": "Test tenant",
            "site_url": TEST_SITE_URL,
            "require_email_verification": false,
        });

        self.create_tenant_from(body).await
    }

    /// Uses the server defaults, where email verification is required.
    pub async fn create_tenant_with_defaults(&self) -> TestResult<CreatedTenant> {
        let body =
            json!({ "slug": random_slug(), "name": "Test tenant", "site_url": TEST_SITE_URL });

        self.create_tenant_from(body).await
    }

    /// Creates a tenant with a given slug (e.g. one whose orphan database already exists).
    /// Creates the platform tenant (whose users are console accounts) and one account in it.
    pub async fn create_platform_account(
        &self,
        email: &str,
    ) -> TestResult<(CreatedTenant, Session)> {
        let platform = self.create_tenant_with_slug(&self.platform_slug).await?;
        let session = self.sign_up(&platform, email).await?;

        Ok((platform, session))
    }

    pub async fn create_tenant_with_slug(&self, slug: &str) -> TestResult<CreatedTenant> {
        let body = json!({
            "slug": slug,
            "name": "Test tenant",
            "site_url": TEST_SITE_URL,
            "require_email_verification": false,
        });

        self.create_tenant_from(body).await
    }

    /// Leaves a tenant database without a tenant row, like a cancelled provisioning would.
    pub async fn create_orphan_database(&self, slug: &str) -> TestResult {
        let base_url = self.config.tenant_database_base_url.trim_end_matches('/');
        let mut maintenance = PgConnection::connect(&format!("{base_url}/postgres")).await?;
        // The slug comes from `random_slug`: `t_` plus hex characters.
        let statement = format!("CREATE DATABASE \"tenant_{slug}\"");
        sqlx::raw_sql(AssertSqlSafe(statement))
            .execute(&mut maintenance)
            .await?;
        maintenance.close().await?;

        Ok(())
    }

    async fn create_tenant_from(&self, body: Value) -> TestResult<CreatedTenant> {
        let response = self
            .client
            .post(self.url("/admin/v1/tenants"))
            .header("x-admin-token", &self.admin_token)
            .json(&body)
            .send()
            .await?;

        Ok(response.error_for_status()?.json().await?)
    }

    pub async fn request_tenant(
        &self,
        slug: &str,
        admin_token: Option<&str>,
    ) -> TestResult<Response> {
        let mut request = self
            .client
            .post(self.url("/admin/v1/tenants"))
            .json(&json!({ "slug": slug, "name": "Test tenant", "site_url": TEST_SITE_URL }));

        if let Some(admin_token) = admin_token {
            request = request.header("x-admin-token", admin_token);
        }

        Ok(request.send().await?)
    }

    pub async fn post_auth(&self, path: &str, api_key: &str, body: Value) -> TestResult<Response> {
        let response = self
            .client
            .post(self.url(path))
            .header("apikey", api_key)
            .json(&body)
            .send()
            .await?;

        Ok(response)
    }

    pub async fn sign_up(&self, tenant: &CreatedTenant, email: &str) -> TestResult<Session> {
        let body = json!({ "email": email, "password": TEST_PASSWORD });
        let response = self
            .post_auth("/auth/v1/signup", &tenant.publishable_key, body)
            .await?;

        Ok(response.error_for_status()?.json().await?)
    }

    pub async fn refresh(
        &self,
        tenant: &CreatedTenant,
        refresh_token: &str,
    ) -> TestResult<Response> {
        let body = json!({ "refresh_token": refresh_token });

        self.post_auth("/auth/v1/refresh", &tenant.publishable_key, body)
            .await
    }

    pub async fn current_user(&self, api_key: &str, access_token: &str) -> TestResult<Response> {
        let response = self
            .client
            .get(self.url("/auth/v1/user"))
            .header("apikey", api_key)
            .bearer_auth(access_token)
            .send()
            .await?;

        Ok(response)
    }

    /// Waits for the email sent to `recipient` and returns the token from its link.
    pub async fn wait_for_email_token(&self, recipient: &str) -> TestResult<String> {
        for _ in 0..MAIL_POLL_ATTEMPTS {
            if let Some(text) = self.latest_email_text(recipient).await? {
                return extract_token(&text);
            }

            tokio::time::sleep(MAIL_POLL_INTERVAL).await;
        }

        Err(format!("no email arrived for {recipient}").into())
    }

    async fn latest_email_text(&self, recipient: &str) -> TestResult<Option<String>> {
        let search_url = format!("{}/api/v1/search", self.mailpit_api_url);
        let query = format!("to:\"{recipient}\"");
        let search: MailpitSearch = self
            .client
            .get(search_url)
            .query(&[("query", query.as_str())])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        // Mailpit lists the newest message first.
        let Some(latest) = search.messages.first() else {
            return Ok(None);
        };
        let message_url = format!("{}/api/v1/message/{}", self.mailpit_api_url, latest.id);
        let message: MailpitMessage = self.client.get(message_url).send().await?.json().await?;

        Ok(Some(message.text))
    }

    pub async fn tenant_database_exists(&self, slug: &str) -> TestResult<bool> {
        let base_url = self.config.tenant_database_base_url.trim_end_matches('/');
        let mut maintenance = PgConnection::connect(&format!("{base_url}/postgres")).await?;
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)")
                .bind(format!("tenant_{slug}"))
                .fetch_one(&mut maintenance)
                .await?;
        maintenance.close().await?;

        Ok(exists)
    }

    /// Removes the tenant row and its database so test runs do not pile up databases.
    pub async fn drop_tenant(&self, tenant: &CreatedTenant) -> TestResult {
        let base_url = self.config.tenant_database_base_url.trim_end_matches('/');
        let mut control_plane =
            PgConnection::connect(&self.config.control_plane_database_url).await?;
        sqlx::query("DELETE FROM tenants WHERE id = $1")
            .bind(tenant.tenant_id)
            .execute(&mut control_plane)
            .await?;
        control_plane.close().await?;

        let mut maintenance = PgConnection::connect(&format!("{base_url}/postgres")).await?;
        // The slug comes from our own generator above: `t_` plus hex characters.
        let statement = format!(
            "DROP DATABASE IF EXISTS \"tenant_{}\" WITH (FORCE)",
            tenant.slug
        );
        sqlx::raw_sql(AssertSqlSafe(statement))
            .execute(&mut maintenance)
            .await?;
        maintenance.close().await?;

        Ok(())
    }
}

pub fn random_slug() -> String {
    format!("t_{}", encode_hex(&random_bytes::<SLUG_SUFFIX_BYTES>()))
}

fn fake_endpoints(fake_github: &FakeGitHub) -> OAuthEndpoints {
    let base_url = &fake_github.base_url;
    let endpoints = ProviderEndpoints {
        authorize_url: format!("{base_url}/login/oauth/authorize"),
        token_url: format!("{base_url}/login/oauth/access_token"),
        api_base_url: base_url.clone(),
    };

    OAuthEndpoints {
        google: endpoints.clone(),
        github: endpoints,
    }
}

fn extract_token(text: &str) -> TestResult<String> {
    let Some((_, after_marker)) = text.split_once("token=") else {
        return Err("email has no token link".into());
    };
    let token: String = after_marker
        .chars()
        .take_while(|character| character.is_ascii_alphanumeric() || *character == '_')
        .collect();

    Ok(token)
}

pub async fn error_code(response: Response) -> TestResult<String> {
    let body: ErrorBody = response.json().await?;

    Ok(body.error)
}

/// A JSON field by pointer (`/user/email`), `null` when missing, so tests never index-panic.
pub fn field<'a>(value: &'a Value, pointer: &str) -> &'a Value {
    value.pointer(pointer).unwrap_or(&Value::Null)
}
