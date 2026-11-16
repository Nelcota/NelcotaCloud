use axum::http::StatusCode;

use crate::auth::refresh_token_repository::revoke_family_of_token;
use crate::crypto::opaque_token::hash_opaque_token;
use crate::http::api_error::ApiError;
use crate::http::routes::refresh_session::RefreshTokenBody;
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

/// Always answers 204, even for unknown tokens, so the endpoint cannot be used to probe tokens.
pub async fn log_out(
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<RefreshTokenBody>,
) -> Result<StatusCode, ApiError> {
    let token_hash = hash_opaque_token(body.refresh_token.trim());
    revoke_family_of_token(&tenant.pool, &token_hash)
        .await
        .map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
