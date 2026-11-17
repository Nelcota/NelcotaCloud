use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

/// Enough for a CRM, an analytics tool and a couple of internal services.
pub const MAX_ENDPOINTS_PER_TENANT: i64 = 5;

/// Columns every query returning a `StoredWebhookEndpoint` selects, built at compile time.
macro_rules! endpoint_columns {
    () => {
        "id, tenant_id, url, event_types, is_enabled, secret_ciphertext, CASE WHEN previous_secret_expires_at > now() THEN previous_secret_ciphertext END AS active_previous_secret_ciphertext, created_at"
    };
}

/// An endpoint as stored, with its secrets still encrypted. The previous secret is only read
/// while it is still valid (database clock).
#[derive(sqlx::FromRow)]
pub struct StoredWebhookEndpoint {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub url: String,
    pub event_types: Vec<String>,
    pub is_enabled: bool,
    pub secret_ciphertext: Vec<u8>,
    pub active_previous_secret_ciphertext: Option<Vec<u8>>,
    pub created_at: OffsetDateTime,
}

pub struct NewWebhookEndpoint<'a> {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub url: &'a str,
    pub event_types: &'a [String],
    pub secret_ciphertext: &'a [u8],
}

pub struct WebhookEndpointChanges<'a> {
    pub url: Option<&'a str>,
    pub event_types: Option<&'a [String]>,
    pub is_enabled: Option<bool>,
}

pub async fn list_endpoints(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<StoredWebhookEndpoint>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        endpoint_columns!(),
        " FROM webhook_endpoints WHERE tenant_id = $1 ORDER BY created_at"
    ))
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}

pub async fn find_endpoint(
    pool: &PgPool,
    tenant_id: Uuid,
    endpoint_id: Uuid,
) -> Result<Option<StoredWebhookEndpoint>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        endpoint_columns!(),
        " FROM webhook_endpoints WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(endpoint_id)
    .fetch_optional(pool)
    .await
}

/// Inserts unless the tenant already has the maximum; `false` when it does. The tenant row is
/// locked first, so two concurrent creations cannot both pass the count.
pub async fn insert_endpoint(
    pool: &PgPool,
    endpoint: NewWebhookEndpoint<'_>,
) -> Result<bool, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    sqlx::query("SELECT id FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(endpoint.tenant_id)
        .execute(&mut *transaction)
        .await?;
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM webhook_endpoints WHERE tenant_id = $1")
            .bind(endpoint.tenant_id)
            .fetch_one(&mut *transaction)
            .await?;

    if count >= MAX_ENDPOINTS_PER_TENANT {
        return Ok(false);
    }

    sqlx::query(
        "INSERT INTO webhook_endpoints (id, tenant_id, url, event_types, secret_ciphertext) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(endpoint.id)
    .bind(endpoint.tenant_id)
    .bind(endpoint.url)
    .bind(endpoint.event_types)
    .bind(endpoint.secret_ciphertext)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(true)
}

/// Applies only the given changes; `false` when the endpoint does not exist.
pub async fn update_endpoint(
    pool: &PgPool,
    (tenant_id, endpoint_id): (Uuid, Uuid),
    changes: WebhookEndpointChanges<'_>,
) -> Result<bool, sqlx::Error> {
    let updated = sqlx::query(
        "UPDATE webhook_endpoints SET url = COALESCE($3, url), event_types = COALESCE($4, event_types), \
         is_enabled = COALESCE($5, is_enabled), updated_at = now() WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(endpoint_id)
    .bind(changes.url)
    .bind(changes.event_types)
    .bind(changes.is_enabled)
    .execute(pool)
    .await?;

    Ok(updated.rows_affected() > 0)
}

pub async fn delete_endpoint(
    pool: &PgPool,
    tenant_id: Uuid,
    endpoint_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let deleted = sqlx::query("DELETE FROM webhook_endpoints WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(endpoint_id)
        .execute(pool)
        .await?;

    Ok(deleted.rows_affected() > 0)
}

/// The current secret becomes the previous one for a day; `false` when there is no endpoint.
pub async fn replace_secret(
    pool: &PgPool,
    (tenant_id, endpoint_id): (Uuid, Uuid),
    secret_ciphertext: &[u8],
) -> Result<bool, sqlx::Error> {
    let updated = sqlx::query(
        "UPDATE webhook_endpoints SET previous_secret_ciphertext = secret_ciphertext, \
         previous_secret_expires_at = now() + interval '1 day', secret_ciphertext = $3, \
         updated_at = now() WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(endpoint_id)
    .bind(secret_ciphertext)
    .execute(pool)
    .await?;

    Ok(updated.rows_affected() > 0)
}

/// Binds an encrypted secret to its endpoint, so it cannot be copied into another row.
pub fn webhook_secret_context(tenant_id: Uuid, endpoint_id: Uuid) -> String {
    format!("webhook_secret:{tenant_id}:{endpoint_id}")
}
