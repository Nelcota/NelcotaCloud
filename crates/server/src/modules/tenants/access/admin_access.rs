use std::future::{Future, ready};

use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::app_state::AppState;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;

pub const ADMIN_TOKEN_HEADER: &str = "x-admin-token";

/// Proof that the request carries the platform admin token.
pub struct AdminAccess;

impl FromRequestParts<AppState> for AdminAccess {
    type Rejection = ApiError;

    /// Nothing to wait for: the check only reads a header, so the future is already resolved.
    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl Future<Output = Result<Self, ApiError>> + Send {
        ready(check_admin_token(parts, state))
    }
}

fn check_admin_token(parts: &Parts, state: &AppState) -> Result<AdminAccess, ApiError> {
    let headers = &parts.headers;
    let Some(header_value) = headers.get(ADMIN_TOKEN_HEADER) else {
        return Err(ApiError::AdminAccessDenied);
    };
    let admin_token = header_value
        .to_str()
        .map_err(|_| ApiError::AdminAccessDenied)?;

    // Comparing digests instead of raw tokens keeps timing differences meaningless to attackers.
    if hash_opaque_token(admin_token.trim()) != state.settings.admin_token_hash {
        return Err(ApiError::AdminAccessDenied);
    }

    Ok(AdminAccess)
}
