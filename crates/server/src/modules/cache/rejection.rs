use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

#[derive(Debug, thiserror::Error)]
pub enum CacheRejection {
    #[error("missing or invalid cache credential")]
    InvalidCredential,
    #[error("only a project owner can manage its cache")]
    OwnerRequired,
    #[error("cache is disabled for this project")]
    Disabled,
    #[error("project cache is temporarily unavailable")]
    Unavailable,
    #[error("cache entry not found")]
    Miss,
    #[error("the project has reached its cache credential limit")]
    CredentialLimit,
}

impl From<CacheRejection> for ApiError {
    fn from(rejection: CacheRejection) -> Self {
        let (status, code) = match rejection {
            CacheRejection::InvalidCredential => {
                (StatusCode::UNAUTHORIZED, "invalid_cache_credential")
            }
            CacheRejection::OwnerRequired => (StatusCode::FORBIDDEN, "cache_owner_required"),
            CacheRejection::Disabled => (StatusCode::CONFLICT, "cache_disabled"),
            CacheRejection::Unavailable => (StatusCode::SERVICE_UNAVAILABLE, "cache_unavailable"),
            CacheRejection::Miss => (StatusCode::NOT_FOUND, "cache_miss"),
            CacheRejection::CredentialLimit => (StatusCode::CONFLICT, "cache_credential_limit"),
        };

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}
