use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::modules::cache::management::cache_credentials::{CacheCredential, list_credentials};
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::ApiError;

#[derive(Serialize, ToSchema)]
pub struct ProjectCacheSettings {
    pub enabled: bool,
    pub configured: bool,
    pub credentials: Vec<CacheCredential>,
}

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct ChangeCacheSettings {
    pub enabled: bool,
}

pub async fn read(owner: &ProjectCacheOwner) -> Result<ProjectCacheSettings, ApiError> {
    let mut transaction = owner.begin().await?;
    let enabled = sqlx::query_scalar("SELECT enabled FROM project_caches WHERE tenant_id = $1")
        .bind(owner.tenant_id)
        .fetch_optional(&mut *transaction)
        .await?
        .unwrap_or(false);
    let credentials = list_credentials(&mut transaction, owner.tenant_id).await?;
    transaction.commit().await?;

    Ok(ProjectCacheSettings {
        enabled,
        configured: owner.is_configured,
        credentials,
    })
}

pub async fn set_enabled(owner: &ProjectCacheOwner, enabled: bool) -> Result<(), ApiError> {
    if enabled {
        owner.require_configured()?;
    }

    let mut transaction = owner.begin().await?;
    sqlx::query(
        "INSERT INTO project_caches (tenant_id, enabled, generation) VALUES ($1, $2, $3) \
         ON CONFLICT (tenant_id) DO UPDATE SET enabled = EXCLUDED.enabled, generation = EXCLUDED.generation \
         WHERE project_caches.enabled <> EXCLUDED.enabled",
    )
    .bind(owner.tenant_id)
    .bind(enabled)
    .bind(Uuid::new_v4())
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(())
}

pub async fn clear(owner: &ProjectCacheOwner) -> Result<(), ApiError> {
    let mut transaction = owner.begin().await?;
    let result =
        sqlx::query("UPDATE project_caches SET generation = $2 WHERE tenant_id = $1 AND enabled")
            .bind(owner.tenant_id)
            .bind(Uuid::new_v4())
            .execute(&mut *transaction)
            .await?;

    if result.rows_affected() == 0 {
        return Err(CacheRejection::Disabled.into());
    }

    transaction.commit().await?;
    Ok(())
}
