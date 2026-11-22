use std::time::Duration;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use super::cache_authentication::authenticate;
use crate::app_state::AppState;
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;
use crate::shared::http::request_span::record_tenant;
use crate::shared::rate_limiting::quota_spec::QuotaSpec;

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
        let (tenant_id, generation) = authenticate(&state.cache_authentication_pool, token).await?;
        record_tenant(tenant_id);
        state
            .rate_limits
            .cache_per_project
            .check(tenant_id, Uuid::nil())?;

        Ok(Self {
            tenant_id,
            generation,
        })
    }
}
