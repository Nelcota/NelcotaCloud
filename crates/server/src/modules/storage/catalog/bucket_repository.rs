use sqlx::{PgPool, PgTransaction};
use uuid::Uuid;

use crate::modules::storage::catalog::bucket::Bucket;
use crate::modules::storage::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

const MAX_PROJECT_BUCKETS: i64 = 50;

pub async fn list_buckets(pool: &PgPool, tenant: Uuid) -> Result<Vec<Bucket>, ApiError> {
    Ok(
        sqlx::query_as("SELECT id, name FROM storage_buckets WHERE tenant_id = $1 ORDER BY name")
            .bind(tenant)
            .fetch_all(pool)
            .await?,
    )
}

pub async fn create_bucket(pool: &PgPool, tenant: Uuid, name: &str) -> Result<Bucket, ApiError> {
    let mut transaction = pool.begin().await?;
    lock_project(&mut transaction, tenant).await?;
    check_bucket_count(&mut transaction, tenant).await?;
    let bucket = sqlx::query_as(
        "INSERT INTO storage_buckets (id, tenant_id, name) VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, name) DO NOTHING RETURNING id, name",
    )
    .bind(Uuid::new_v4())
    .bind(tenant)
    .bind(name)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or(StorageError::DuplicateBucket)?;
    transaction.commit().await?;

    Ok(bucket)
}

pub async fn delete_bucket(pool: &PgPool, tenant: Uuid, bucket: Uuid) -> Result<(), ApiError> {
    let found = sqlx::query("DELETE FROM storage_buckets WHERE tenant_id = $1 AND id = $2")
        .bind(tenant)
        .bind(bucket)
        .execute(pool)
        .await?;

    if found.rows_affected() == 0 {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(())
}

pub async fn lock_project(
    transaction: &mut PgTransaction<'_>,
    tenant: Uuid,
) -> Result<(), ApiError> {
    let project = sqlx::query_scalar::<_, Uuid>("SELECT id FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(tenant)
        .fetch_optional(&mut **transaction)
        .await?;

    if project.is_none() {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(())
}

async fn check_bucket_count(
    transaction: &mut PgTransaction<'_>,
    tenant: Uuid,
) -> Result<(), ApiError> {
    let count =
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM storage_buckets WHERE tenant_id = $1")
            .bind(tenant)
            .fetch_one(&mut **transaction)
            .await?;

    if count >= MAX_PROJECT_BUCKETS {
        return Err(StorageError::BucketLimit.into());
    }

    Ok(())
}
