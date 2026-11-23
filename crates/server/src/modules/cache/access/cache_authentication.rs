use std::time::{Duration, Instant};

use sqlx::PgPool;
use tokio::time::timeout;
use uuid::Uuid;

use crate::modules::cache::credentials::cache_token::{credential_id, token_matches};
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::ApiError;

const QUERY_TIMEOUT: Duration = Duration::from_millis(500);

pub(super) async fn authenticate(pool: &PgPool, token: &str) -> Result<(Uuid, Uuid), ApiError> {
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
    let query = sqlx::query_as::<_, (Uuid, Uuid, bool, Vec<u8>)>(
        "SELECT cache.tenant_id, cache.generation, cache.enabled, credentials.token_hash \
         FROM project_cache_credentials credentials \
         JOIN project_caches cache ON cache.tenant_id = credentials.tenant_id WHERE credentials.id = $1",
    )
    .bind(credential_id);
    let result = timeout(QUERY_TIMEOUT, query.fetch_optional(&mut *connection)).await;
    let credential = match result {
        Ok(result) => result.map_err(|error| authentication_unavailable(&error))?,
        Err(_) => {
            connection.close_on_drop();
            tracing::debug!("cache credential query timed out");
            return Err(CacheRejection::Unavailable.into());
        }
    };
    let (tenant_id, generation, enabled, hash) =
        credential.ok_or(CacheRejection::InvalidCredential)?;
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

    Ok((tenant_id, generation))
}

fn authentication_unavailable(error: &sqlx::Error) -> ApiError {
    tracing::debug!(%error, "cache credential database unavailable");
    CacheRejection::Unavailable.into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::cache::credentials::cache_token::credential_prefix;
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
}
