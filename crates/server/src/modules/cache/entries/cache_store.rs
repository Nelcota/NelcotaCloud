use std::time::Duration;

use redis::aio::{ConnectionManager, ConnectionManagerConfig};
use serde_json::Value;

use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::ApiError;

const COMMAND_TIMEOUT: Duration = Duration::from_millis(250);

#[derive(Debug, thiserror::Error)]
#[error("CACHE_VALKEY_URL must be an authenticated redis:// URL for a private Valkey instance")]
pub struct InvalidCacheUrl;

#[derive(Clone)]
pub struct CacheStore {
    connection: ConnectionManager,
}

impl CacheStore {
    pub fn connect_lazily(url: &str) -> Result<Self, InvalidCacheUrl> {
        let client = redis::Client::open(url).map_err(|_| InvalidCacheUrl)?;
        let connection_info = client.get_connection_info();

        if url.starts_with("redis://") == false
            || connection_info
                .redis_settings()
                .password()
                .is_none_or(str::is_empty)
        {
            return Err(InvalidCacheUrl);
        }

        let config = ConnectionManagerConfig::new()
            .set_number_of_retries(0)
            .set_concurrency_limit(64)
            .set_connection_timeout(Some(COMMAND_TIMEOUT))
            .set_response_timeout(Some(COMMAND_TIMEOUT));
        let connection =
            ConnectionManager::new_lazy_with_config(client, config).map_err(|_| InvalidCacheUrl)?;

        Ok(Self { connection })
    }

    pub async fn get(&self, key: &str) -> Result<Value, ApiError> {
        let bytes: Option<Vec<u8>> = self.execute(redis::cmd("GET").arg(key)).await?;
        let bytes = bytes.ok_or(CacheRejection::Miss)?;

        serde_json::from_slice(&bytes).map_err(|_| CacheRejection::Unavailable.into())
    }

    pub async fn set(&self, key: &str, value: &[u8], ttl_seconds: u64) -> Result<(), ApiError> {
        self.execute(
            redis::cmd("SET")
                .arg(key)
                .arg(value)
                .arg("EX")
                .arg(ttl_seconds),
        )
        .await
    }

    pub async fn delete(&self, key: &str) -> Result<(), ApiError> {
        let _: u64 = self.execute(redis::cmd("DEL").arg(key)).await?;

        Ok(())
    }

    async fn execute<T: redis::FromRedisValue>(&self, command: &redis::Cmd) -> Result<T, ApiError> {
        let mut connection = self.connection.clone();
        let result =
            tokio::time::timeout(COMMAND_TIMEOUT, command.query_async(&mut connection)).await;

        match result {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(error)) => {
                tracing::debug!(kind = ?error.kind(), "project cache command failed");
                Err(CacheRejection::Unavailable.into())
            }
            Err(_) => Err(CacheRejection::Unavailable.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn requires_an_authenticated_redis_url_without_connecting_at_startup() {
        for url in [
            "",
            "https://valkey:6379",
            "redis://valkey:6379",
            "redis://:@valkey:6379",
        ] {
            assert!(CacheStore::connect_lazily(url).is_err());
        }

        assert!(CacheStore::connect_lazily("redis://:test-password@127.0.0.1:1").is_ok());
    }
}
