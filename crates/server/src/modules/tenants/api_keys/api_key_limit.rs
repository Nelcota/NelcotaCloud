use sqlx::PgConnection;
use uuid::Uuid;

/// Active keys a project may hold at once: enough for rotations and several apps, while the
/// list stays short and a script cannot create keys without end.
pub const MAX_ACTIVE_API_KEYS: i64 = 20;

/// Whether one more key fits, under the caller's tenant row lock.
pub async fn has_room_for_api_key(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let active: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM tenant_api_keys WHERE tenant_id = $1 AND revoked_at IS NULL",
    )
    .bind(tenant_id)
    .fetch_one(connection)
    .await?;

    Ok(active < MAX_ACTIVE_API_KEYS)
}
