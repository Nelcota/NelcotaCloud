use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::catalog::reservations::CONFIRMATION_GRACE_SECONDS;

pub(super) async fn expire_uploads(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM storage_objects WHERE id IN (
            SELECT id FROM storage_objects WHERE is_ready = false
            AND upload_expires_at <= now() - make_interval(secs => $1)
            ORDER BY upload_expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
        )",
    )
    .bind(CONFIRMATION_GRACE_SECONDS)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub(super) async fn claim_deletions(pool: &PgPool) -> Result<Vec<ObjectKey>, sqlx::Error> {
    sqlx::query_as(
        "UPDATE storage_object_deletions SET next_attempt_at = now() + interval '2 minutes' WHERE id IN (
            SELECT id FROM storage_object_deletions WHERE next_attempt_at <= now()
            ORDER BY next_attempt_at LIMIT 8 FOR UPDATE SKIP LOCKED
        ) RETURNING id, tenant_id, bucket_id",
    )
    .fetch_all(pool)
    .await
}

pub(super) async fn acknowledge_deletion(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM storage_object_deletions WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
