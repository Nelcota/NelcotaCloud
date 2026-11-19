use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::modules::cache::access::credential_prefix;
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::crypto::opaque_token::OpaqueToken;
use crate::shared::http::api_error::ApiError;

const MAX_CREDENTIALS: i64 = 10;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct CreateCacheCredential {
    #[validate(length(max = 64), custom(function = "validate_name"))]
    pub name: String,
}

#[derive(Serialize, sqlx::FromRow, ToSchema)]
pub struct CacheCredential {
    pub id: Uuid,
    pub name: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Serialize, ToSchema)]
pub struct IssuedCacheCredential {
    #[serde(flatten)]
    pub credential: CacheCredential,
    pub token: String,
}

pub async fn list_credentials(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<Vec<CacheCredential>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name, created_at FROM project_cache_credentials \
         WHERE tenant_id = $1 ORDER BY created_at DESC, id",
    )
    .bind(tenant_id)
    .fetch_all(connection)
    .await
}

pub async fn issue(
    owner: &ProjectCacheOwner,
    request: CreateCacheCredential,
) -> Result<IssuedCacheCredential, ApiError> {
    owner.require_configured()?;
    let mut transaction = owner.begin().await?;
    let id = Uuid::new_v4();
    let token = OpaqueToken::generate(&credential_prefix(id));
    let credential = sqlx::query_as(
        "INSERT INTO project_cache_credentials (id, tenant_id, name, token_hash) \
         SELECT $1, $2, $3, $4 FROM project_caches WHERE tenant_id = $2 AND enabled \
         AND (SELECT count(*) FROM project_cache_credentials WHERE tenant_id = $2) < $5 \
         RETURNING id, name, created_at",
    )
    .bind(id)
    .bind(owner.tenant_id)
    .bind(request.name.trim())
    .bind(token.hash.as_slice())
    .bind(MAX_CREDENTIALS)
    .fetch_optional(&mut *transaction)
    .await?;
    let credential = issued_or_rejected(&mut transaction, owner.tenant_id, credential).await?;
    transaction.commit().await?;

    Ok(IssuedCacheCredential {
        credential,
        token: token.plaintext,
    })
}

async fn issued_or_rejected(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    credential: Option<CacheCredential>,
) -> Result<CacheCredential, ApiError> {
    if let Some(credential) = credential {
        return Ok(credential);
    }

    let enabled: Option<bool> =
        sqlx::query_scalar("SELECT enabled FROM project_caches WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_optional(connection)
            .await?;

    match enabled {
        Some(true) => Err(CacheRejection::CredentialLimit.into()),
        _ => Err(CacheRejection::Disabled.into()),
    }
}

pub async fn revoke(owner: &ProjectCacheOwner, credential_id: Uuid) -> Result<(), ApiError> {
    let mut transaction = owner.begin().await?;
    let result =
        sqlx::query("DELETE FROM project_cache_credentials WHERE tenant_id = $1 AND id = $2")
            .bind(owner.tenant_id)
            .bind(credential_id)
            .execute(&mut *transaction)
            .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound("cache credential"));
    }

    transaction.commit().await?;
    Ok(())
}

fn validate_name(name: &str) -> Result<(), ValidationError> {
    if name.trim().is_empty() || name.chars().any(char::is_control) {
        let mut error = ValidationError::new("invalid_credential_name");
        error.message = Some("name must be nonblank and contain no control characters".into());
        return Err(error);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_credential_names() {
        for name in [" ".to_owned(), "test\n".to_owned(), "a".repeat(65)] {
            assert!(CreateCacheCredential { name }.validate().is_err());
        }

        assert!(
            CreateCacheCredential {
                name: "Application backend".to_owned()
            }
            .validate()
            .is_ok()
        );
    }
}
