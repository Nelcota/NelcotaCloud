use std::time::{Duration, Instant};

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use hmac::digest::CtOutput;
use sha2::Sha256;
use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;
use crate::shared::http::request_span::record_tenant;
use crate::shared::rate_limiting::quota_spec::QuotaSpec;

const TOKEN_PREFIX: &str = "nc_cache_";
const TOKEN_SECRET_LENGTH: usize = 64;

pub const CACHE_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 100,
    replenish_every: Duration::from_millis(20),
};

pub struct CacheAccess {
    tenant_id: Uuid,
    generation: Uuid,
}

impl CacheAccess {
    pub fn entry_key(&self, key: &str) -> String {
        let tenant_id = self.tenant_id;
        let generation = self.generation;

        format!("project-cache:{tenant_id}:{generation}:{key}")
    }
}

impl FromRequestParts<AppState> for CacheAccess {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let token = bearer_token(parts).ok_or(CacheRejection::InvalidCredential)?;
        let access = authenticate(&state.cache_authentication_pool, token).await?;
        let tenant_id = access.tenant_id;
        record_tenant(tenant_id);
        state
            .rate_limits
            .cache_per_project
            .check(tenant_id, Uuid::nil())?;

        Ok(access)
    }
}

pub fn credential_prefix(credential_id: Uuid) -> String {
    format!("{TOKEN_PREFIX}{credential_id}_")
}

async fn authenticate(pool: &PgPool, token: &str) -> Result<CacheAccess, ApiError> {
    let credential_id = credential_id(token).ok_or(CacheRejection::InvalidCredential)?;
    let started = Instant::now();
    let mut connection = pool
        .acquire()
        .await
        .map_err(|error| authentication_unavailable(&error))?;
    tracing::debug!(
        wait_ms = started.elapsed().as_secs_f64() * 1_000.0,
        "cache database connection acquired"
    );
    let started = Instant::now();
    let (tenant_id, generation, enabled, hash): (Uuid, Uuid, bool, Vec<u8>) = sqlx::query_as(
        "SELECT cache.tenant_id, cache.generation, cache.enabled, credentials.token_hash \
         FROM project_cache_credentials credentials \
         JOIN project_caches cache ON cache.tenant_id = credentials.tenant_id WHERE credentials.id = $1",
    )
    .bind(credential_id)
    .fetch_optional(&mut *connection)
    .await
    .map_err(|error| authentication_unavailable(&error))?
    .ok_or(CacheRejection::InvalidCredential)?;
    tracing::debug!(
        query_ms = started.elapsed().as_secs_f64() * 1_000.0,
        "cache credential loaded"
    );
    let is_valid = token_matches(token, hash)?;

    if is_valid == false {
        return Err(CacheRejection::InvalidCredential.into());
    }

    if enabled == false {
        return Err(CacheRejection::Disabled.into());
    }

    Ok(CacheAccess {
        tenant_id,
        generation,
    })
}

fn authentication_unavailable(error: &sqlx::Error) -> ApiError {
    tracing::debug!(%error, "cache credential database unavailable");
    CacheRejection::Unavailable.into()
}

fn credential_id(token: &str) -> Option<Uuid> {
    let body = token.strip_prefix(TOKEN_PREFIX)?;
    let (id, secret) = body.split_once('_')?;

    if secret.len() != TOKEN_SECRET_LENGTH
        || secret.bytes().all(|byte| byte.is_ascii_hexdigit()) == false
    {
        return None;
    }

    Uuid::parse_str(id).ok()
}

fn token_matches(token: &str, hash: Vec<u8>) -> Result<bool, ApiError> {
    let expected = <[u8; 32]>::try_from(hash)
        .map_err(|_| ApiError::internal("invalid stored cache credential hash length"))?;
    let presented = CtOutput::<Sha256>::new(hash_opaque_token(token).into());
    let expected = CtOutput::<Sha256>::new(expected.into());

    Ok(presented == expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::opaque_token::OpaqueToken;

    #[tokio::test]
    async fn reports_an_unavailable_credential_pool() -> Result<(), sqlx::Error> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .connect_lazy("postgres://127.0.0.1:1/cache_test")?;
        pool.close().await;
        let credential = OpaqueToken::generate(&credential_prefix(Uuid::new_v4()));
        let response = authenticate(&pool, &credential.plaintext).await;

        assert!(
            matches!(response, Err(error) if error.rejection_code() == Some("cache_unavailable"))
        );
        assert_eq!(pool.size(), 0);
        Ok(())
    }

    #[test]
    fn recognizes_only_cache_credentials() {
        let id = Uuid::new_v4();
        let credential = OpaqueToken::generate(&credential_prefix(id));

        assert_eq!(credential_id(&credential.plaintext), Some(id));
        assert_eq!(credential_id("nc_sk_secret"), None);
        assert_eq!(credential_id(&credential_prefix(id)), None);
        assert_eq!(
            credential_id(&format!("{TOKEN_PREFIX}bad_{}", "a".repeat(64))),
            None
        );
        assert_eq!(
            credential_id(&format!("{}{}", credential_prefix(id), "z".repeat(64))),
            None
        );
    }

    #[test]
    fn verifies_the_stored_hash() -> Result<(), ApiError> {
        let token = OpaqueToken::generate(&credential_prefix(Uuid::new_v4()));
        assert!(token_matches(&token.plaintext, token.hash.to_vec())?);
        assert!(token_matches("wrong secret", token.hash.to_vec())? == false);
        assert!(token_matches(&token.plaintext, Vec::new()).is_err());
        Ok(())
    }
}
