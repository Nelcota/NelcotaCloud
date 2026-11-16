use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// What an owner sees about a configured provider: its public client ID, never the secret.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct ConfiguredProvider {
    /// `google` or `github`.
    pub provider: String,
    pub client_id: String,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

pub async fn list_configured_providers(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<ConfiguredProvider>, sqlx::Error> {
    sqlx::query_as(
        "SELECT provider, client_id, updated_at FROM tenant_oauth_providers WHERE tenant_id = $1 ORDER BY provider",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}
