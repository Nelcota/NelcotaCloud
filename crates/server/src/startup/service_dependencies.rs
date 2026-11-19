use std::str::FromStr;
use std::time::Duration;

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{Connection, PgPool};

use crate::modules::tenants::postgres::runtime_roles::{
    CONTROL_RUNTIME_ROLE, configure_runtime_roles, grant_control_runtime,
};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::endpoint::webhook_url::WebhookHostPolicy;
use crate::shared::crypto::hex_encoding::decode_hex;
use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::database::migrators::CONTROL_PLANE_MIGRATOR;
use crate::startup::startup_error::StartupError;

const CONTROL_PLANE_MAX_CONNECTIONS: u32 = 10;
const WORKER_CONTROL_PLANE_MAX_CONNECTIONS: u32 = 3;
const CACHE_AUTHENTICATION_CONNECTIONS: u32 = 3;
const CACHE_AUTHENTICATION_WAIT: Duration = Duration::from_millis(250);
const CACHE_CONNECTION_PING_INTERVAL: Duration = Duration::from_secs(5);

pub(super) async fn connect_control_plane(url: &str) -> Result<PgPool, StartupError> {
    let options = PgConnectOptions::from_str(url)?;
    let pool = control_plane_pool(options, CONTROL_PLANE_MAX_CONNECTIONS).await?;
    CONTROL_PLANE_MIGRATOR.run(&pool).await?;

    Ok(pool)
}

pub(super) async fn connect_runtime_control_plane(url: &str) -> Result<PgPool, StartupError> {
    control_plane_pool(
        PgConnectOptions::from_str(url)?,
        WORKER_CONTROL_PLANE_MAX_CONNECTIONS,
    )
    .await
}

pub(super) async fn prepare_control_plane(
    url: &str,
    password: Option<&str>,
) -> Result<PgPool, StartupError> {
    let admin_pool = connect_control_plane(url).await?;
    let password = match password {
        Some(password) => password,
        None => return Ok(admin_pool),
    };
    let options = PgConnectOptions::from_str(url)?;
    configure_runtime_roles(options.clone(), password).await?;
    grant_control_runtime(&admin_pool).await?;
    admin_pool.close().await;

    control_plane_pool(
        options.username(CONTROL_RUNTIME_ROLE).password(password),
        CONTROL_PLANE_MAX_CONNECTIONS,
    )
    .await
}

async fn control_plane_pool(
    options: PgConnectOptions,
    max_connections: u32,
) -> Result<PgPool, StartupError> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_slow_threshold(Duration::from_millis(100))
        .connect_with(options.application_name("nelcota-control"))
        .await?;

    Ok(pool)
}

pub(super) fn cache_authentication_pool(control_plane: &PgPool) -> PgPool {
    let options = control_plane
        .connect_options()
        .as_ref()
        .clone()
        .application_name("nelcota-cache-auth");

    PgPoolOptions::new()
        .max_connections(CACHE_AUTHENTICATION_CONNECTIONS)
        .acquire_timeout(CACHE_AUTHENTICATION_WAIT)
        .idle_timeout(Duration::from_secs(15))
        .test_before_acquire(false)
        .before_acquire(|connection, metadata| {
            Box::pin(async move {
                if metadata.idle_for >= CACHE_CONNECTION_PING_INTERVAL {
                    connection.ping().await?;
                }

                Ok(true)
            })
        })
        .connect_lazy_with(options)
}

pub(super) fn master_secret_box(raw_key: &str) -> Result<SecretBox, StartupError> {
    let master_key = decode_hex(raw_key.trim())?;

    Ok(SecretBox::new(&master_key)?)
}

pub(super) fn webhook_transport(
    allow_private: Option<bool>,
) -> Result<WebhookTransport, StartupError> {
    let policy = match allow_private {
        Some(true) => WebhookHostPolicy::AllowPrivate,
        _ => WebhookHostPolicy::PublicHttpsOnly,
    };

    Ok(WebhookTransport::new(policy)?)
}
