use std::error::Error;
use std::future::IntoFuture;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::str::FromStr;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, LazyLock};
use std::time::Duration;

use reqwest::{Client, Response};
use serde::Deserialize;
use serde_json::{Value, json};
use server::app_config::AppConfig;
use server::modules::oauth::provider::provider_endpoints::{OAuthEndpoints, ProviderEndpoints};
use server::modules::storage::object_store::r2_config::R2Config;
use server::router::build_router;
use server::shared::crypto::hex_encoding::encode_hex;
use server::shared::crypto::random_bytes::random_bytes;
use server::startup::app_state_builder::build_app_state_with_endpoints;
use server::startup::webhook_worker_config::WebhookWorkerConfig;
use server::startup::webhook_worker_process::build_webhook_worker;
use sqlx::postgres::PgConnectOptions;
use sqlx::{AssertSqlSafe, Connection, PgConnection};
use tokio::net::TcpListener;
use tokio::sync::{OwnedSemaphorePermit, Semaphore, watch};
use tokio::task::JoinSet;
use uuid::Uuid;

use crate::fixtures::fake_github::FakeGitHub;
use crate::fixtures::fake_turnstile::FakeTurnstile;

pub type TestResult<T = ()> = Result<T, Box<dyn Error>>;

const SECRET_BYTES: usize = 32;
// All fixture APIs and workers share the same control plane and encryption key.
static MASTER_KEY: LazyLock<String> = LazyLock::new(|| encode_hex(&random_bytes::<SECRET_BYTES>()));
// Fixture clients share the control plane but should model independent client addresses.
static NEXT_CLIENT_IP: LazyLock<AtomicU32> =
    LazyLock::new(|| AtomicU32::new(u32::from_be_bytes(random_bytes::<4>())));
// Include server-side causes of generic HTTP errors in the failing test's output.
static TEST_TRACING: LazyLock<()> = LazyLock::new(|| {
    tracing_subscriber::fmt()
        .with_test_writer()
        .with_max_level(tracing::Level::ERROR)
        .init();
});
/// Test APIs alive at once. Each keeps its own control plane, cache and tenant pools, so on a
/// machine with many cores the parallel tests would otherwise exhaust the default
/// `max_connections` of 100 and fail at random.
const MAX_LIVE_SERVERS: usize = 4;
static LIVE_SERVERS: LazyLock<Arc<Semaphore>> =
    LazyLock::new(|| Arc::new(Semaphore::new(MAX_LIVE_SERVERS)));
const SLUG_SUFFIX_BYTES: usize = 6;
const EMAIL_SUFFIX_BYTES: usize = 6;
const MAIL_POLL_ATTEMPTS: u32 = 50;
const MAIL_POLL_INTERVAL: Duration = Duration::from_millis(100);
/// Random per test run: a fixed string in code reads as a hard-coded credential.
pub static TEST_PASSWORD: LazyLock<String> =
    LazyLock::new(|| encode_hex(&random_bytes::<TEST_PASSWORD_BYTES>()));
const TEST_PASSWORD_BYTES: usize = 16;
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

/// A real API on a free local port, with its own admin token.
pub struct TestServer {
    /// Held while the server lives; see `MAX_LIVE_SERVERS`.
    _live_slot: OwnedSemaphorePermit,
    _background: server::startup::background_tasks::BackgroundTasks,
    workers: JoinSet<()>,
    pub client: Client,
    pub client_ip: Ipv4Addr,
    pub fake_github: FakeGitHub,
    /// Kept alive for the whole test: the server checks captcha tokens against it.
    _fake_turnstile: FakeTurnstile,
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
        Self::start_with_google(None).await
    }

    pub async fn start_with_worker() -> TestResult<Self> {
        let mut server = Self::start().await?;
        server.start_worker().await?;

        Ok(server)
    }

    pub async fn start_worker(&mut self) -> TestResult {
        let config = WebhookWorkerConfig {
            control_plane_database_url: self.config.control_plane_database_url.clone(),
            tenant_database_base_url: self.config.tenant_database_base_url.clone(),
            database_schema_managed_externally: None,
            master_key_hex: self.config.master_key_hex.clone(),
            webhook_allow_private_hosts: self.config.webhook_allow_private_hosts,
        };
        let worker = build_webhook_worker(&config).await?;
        self.workers.spawn(async move {
            let (stop, stopped) = watch::channel(false);
            worker.run(stopped).await;
            drop(stop);
        });

        Ok(())
    }

    pub async fn start_with_google(google: Option<ProviderEndpoints>) -> TestResult<Self> {
        Self::start_with_options(google, None, None).await
    }

    pub async fn start_with_cache(cache_url: String) -> TestResult<Self> {
        Self::start_with_options(None, Some(cache_url), None).await
    }

    pub async fn start_with_storage(endpoint: String) -> TestResult<Self> {
        Self::start_with_r2(R2Config {
            endpoint: &endpoint,
            bucket: "test-files",
            access_key_id: "test-key",
            secret_access_key: "test-secret",
        })
        .await
    }

    pub async fn start_with_r2(config: R2Config<'_>) -> TestResult<Self> {
        Self::start_with_options(None, None, Some(config)).await
    }

    async fn start_with_options(
        google: Option<ProviderEndpoints>,
        cache_url: Option<String>,
        storage: Option<R2Config<'_>>,
    ) -> TestResult<Self> {
        LazyLock::force(&TEST_TRACING);
        let live_slot = Arc::clone(&LIVE_SERVERS).acquire_owned().await?;

        if let Err(error) = dotenvy::dotenv()
            && error.not_found() == false
        {
            return Err(error.into());
        }

        let admin_token = encode_hex(&random_bytes::<SECRET_BYTES>());
        let platform_slug = random_slug();
        let fake_turnstile = FakeTurnstile::start().await;
        let config = AppConfig {
            control_plane_database_url: std::env::var("CONTROL_PLANE_DATABASE_URL")?,
            tenant_database_base_url: std::env::var("TENANT_DATABASE_BASE_URL")?,
            database_runtime_password: None,
            master_key_hex: MASTER_KEY.clone(),
            admin_token: admin_token.clone(),
            public_base_url: "http://auth.test".to_owned(),
            bind_address: "127.0.0.1:0".to_owned(),
            smtp_url: std::env::var("SMTP_URL")?,
            email_from: std::env::var("EMAIL_FROM")?,
            client_ip_header: None,
            tenant_smtp_allow_any_host: Some(true),
            webhook_allow_private_hosts: Some(true),
            webhook_worker_replicas: Some(2),
            cache_valkey_url: cache_url.or_else(|| {
                std::env::var("CACHE_VALKEY_URL")
                    .ok()
                    .filter(|url| url.trim().is_empty() == false)
            }),
            storage_r2_bucket: storage.as_ref().map(|config| config.bucket.to_owned()),
            storage_r2_access_key_id: storage
                .as_ref()
                .map(|config| config.access_key_id.to_owned()),
            storage_r2_secret_access_key: storage
                .as_ref()
                .map(|config| config.secret_access_key.to_owned()),
            storage_r2_endpoint: storage.map(|config| config.endpoint.to_owned()),
            platform_tenant_slug: Some(platform_slug.clone()),
            captcha_verify_url: Some(fake_turnstile.verify_url.clone()),
        };
        let fake_github = FakeGitHub::start().await;
        let endpoints = fake_endpoints(&fake_github, google);
        let (state, background) = build_app_state_with_endpoints(&config, endpoints).await?;
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

        let [_, high, middle, low] = NEXT_CLIENT_IP.fetch_add(1, Ordering::Relaxed).to_be_bytes();
        let client_ip = Ipv4Addr::new(127, high, middle, low);
        let client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .local_address(IpAddr::V4(client_ip))
            .build()?;

        Ok(Self {
            _live_slot: live_slot,
            _background: background,
            workers: JoinSet::new(),
            client,
            client_ip,
            fake_github,
            _fake_turnstile: fake_turnstile,
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

    pub fn tenant_database_base_url(&self) -> &str {
        self.config.tenant_database_base_url.trim_end_matches('/')
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
        let session = self.sign_up_console_account(&platform, email).await?;

        Ok((platform, session))
    }

    /// Console accounts need a verified email: signs up, opens the verification link and logs
    /// in again, so the session belongs to a verified account.
    pub async fn sign_up_console_account(
        &self,
        platform: &CreatedTenant,
        email: &str,
    ) -> TestResult<Session> {
        self.sign_up(platform, email).await?;
        let api_key = &platform.publishable_key;
        self.post_auth(
            "/auth/v1/verify-email/resend",
            api_key,
            json!({ "email": email }),
        )
        .await?
        .error_for_status()?;
        let token = self.wait_for_email_token(email).await?;
        self.post_auth("/auth/v1/verify-email", api_key, json!({ "token": token }))
            .await?
            .error_for_status()?;
        let credentials = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
        let login = self
            .post_auth("/auth/v1/login", api_key, credentials)
            .await?;

        Ok(login.error_for_status()?.json().await?)
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
        let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
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

    /// Waits for the email sent to `recipient` and returns its plain-text body.
    pub async fn wait_for_email_text(&self, recipient: &str) -> TestResult<String> {
        for _ in 0..MAIL_POLL_ATTEMPTS {
            if let Some(text) = self.latest_email_text(recipient).await? {
                return Ok(text);
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
        let latest = match search.messages.first() {
            Some(latest) => latest,
            None => return Ok(None),
        };
        let message_url = format!("{}/api/v1/message/{}", self.mailpit_api_url, latest.id);
        let message: MailpitMessage = self.client.get(message_url).send().await?.json().await?;

        Ok(Some(message.text))
    }

    /// Bans a user straight in the tenant database without ending their sessions, like a ban
    /// that raced with a login creating a new session.
    pub async fn ban_without_ending_sessions(
        &self,
        tenant: &CreatedTenant,
        user_id: Uuid,
    ) -> TestResult {
        let mut connection = self.tenant_database(tenant).await?;
        sqlx::query("UPDATE users SET banned_at = now() WHERE id = $1")
            .bind(user_id)
            .execute(&mut connection)
            .await?;
        connection.close().await?;

        Ok(())
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

    /// A direct connection to a tenant's database, for state no endpoint can create quickly.
    /// It searches `auth`, like the server's own pool, so tests name Auth tables unqualified.
    pub async fn tenant_database(&self, tenant: &CreatedTenant) -> TestResult<PgConnection> {
        let options = self.tenant_database_options(tenant)?;

        Ok(PgConnection::connect_with(&options).await?)
    }

    pub async fn tenant_fixture_pool(&self, tenant: &CreatedTenant) -> TestResult<sqlx::PgPool> {
        let options = self.tenant_database_options(tenant)?;

        Ok(sqlx::postgres::PgPoolOptions::new()
            .max_connections(3)
            .connect_with(options)
            .await?)
    }

    fn tenant_database_options(&self, tenant: &CreatedTenant) -> TestResult<PgConnectOptions> {
        let base_url = self.config.tenant_database_base_url.trim_end_matches('/');
        let database_url = format!("{base_url}/tenant_{}", tenant.slug);
        let options = PgConnectOptions::from_str(&database_url)?.options([("search_path", "auth")]);

        Ok(options)
    }

    /// A direct connection to the control plane, for state no endpoint can create quickly.
    pub async fn control_plane(&self) -> TestResult<PgConnection> {
        Ok(PgConnection::connect(&self.config.control_plane_database_url).await?)
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
        // The project's own Data API login role goes with its database.
        let drop_role = format!("DROP ROLE IF EXISTS \"nelcota_t_{}\"", tenant.slug);
        sqlx::raw_sql(AssertSqlSafe(drop_role))
            .execute(&mut maintenance)
            .await?;
        maintenance.close().await?;

        Ok(())
    }
}

pub fn random_slug() -> String {
    format!("t_{}", encode_hex(&random_bytes::<SLUG_SUFFIX_BYTES>()))
}

fn fake_endpoints(fake_github: &FakeGitHub, google: Option<ProviderEndpoints>) -> OAuthEndpoints {
    let base_url = &fake_github.base_url;
    let endpoints = ProviderEndpoints {
        authorize_url: format!("{base_url}/login/oauth/authorize"),
        token_url: format!("{base_url}/login/oauth/access_token"),
        api_base_url: base_url.clone(),
    };

    OAuthEndpoints {
        google: google.unwrap_or_else(|| endpoints.clone()),
        github: endpoints,
    }
}

fn extract_token(text: &str) -> TestResult<String> {
    let (_, after_marker) = text.split_once("token=").ok_or("email has no token link")?;
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
