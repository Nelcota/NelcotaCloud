use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

/// Replaces the project's logo and returns when it changed.
pub async fn store_logo(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    image: &[u8],
) -> Result<OffsetDateTime, sqlx::Error> {
    sqlx::query_scalar(
        "INSERT INTO tenant_logos (tenant_id, image) VALUES ($1, $2) \
         ON CONFLICT (tenant_id) DO UPDATE SET image = EXCLUDED.image, updated_at = now() \
         RETURNING updated_at",
    )
    .bind(tenant_id)
    .bind(image)
    .fetch_one(connection)
    .await
}

pub async fn find_logo(pool: &PgPool, tenant_id: Uuid) -> Result<Option<Vec<u8>>, sqlx::Error> {
    sqlx::query_scalar("SELECT image FROM tenant_logos WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
}

/// `false` when the project had no logo.
pub async fn delete_logo(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let deleted = sqlx::query("DELETE FROM tenant_logos WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(connection)
        .await?;

    Ok(deleted.rows_affected() > 0)
}
