use sqlx::error::DatabaseError;
use sqlx::{PgPool, PgTransaction};
use uuid::Uuid;

use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

/// Serialize storage quota checks across replicas without locking project metadata.
pub(super) async fn begin_catalog_write(
    pool: &PgPool,
    tenant: Uuid,
) -> Result<PgTransaction<'static>, ApiError> {
    // Begin and set the transaction-local timeout in one PostgreSQL simple query.
    let mut transaction = pool
        .begin_with("BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL lock_timeout = '750ms'")
        .await?;
    let project = sqlx::query(
        "SELECT pg_advisory_xact_lock(hashtextextended('storage_catalog:' || id::text, 0))
         FROM tenants WHERE id = $1",
    )
    .bind(tenant)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(catalog_write_error)?;

    if project.is_none() {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(transaction)
}

pub(super) fn catalog_write_error(error: sqlx::Error) -> ApiError {
    let code = error.as_database_error().and_then(DatabaseError::code);

    if code.as_deref() == Some("55P03") {
        return ApiError::ServiceBusy;
    }

    error.into()
}
