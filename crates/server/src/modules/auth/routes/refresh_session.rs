use crate::shared::http::api_error::ErrorBody;
use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::session::refresh_token_repository::{
    RefreshTokenStatus, consume_refresh_token, revoke_token_family,
};
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::requires_email_verification;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct RefreshTokenBody {
    #[validate(length(min = 1, max = 256))]
    pub refresh_token: String,
}

/// `POST /refresh`: rotates the refresh token. The presented token is consumed first, so a
/// refused refresh (e.g. email verification now required) also ends that session.
#[utoipa::path(
    post,
    path = "/auth/v1/refresh",
    tag = "auth",
    security(("api_key" = [])),
    request_body = RefreshTokenBody,
    responses(
        (status = 200, description = "New tokens; the refresh token sent is no longer valid", body = SessionTokens),
        (status = 401, description = "Invalid, expired, reused or revoked refresh token", body = ErrorBody),
        (status = 403, description = "Email not verified yet", body = ErrorBody),
    )
)]
pub async fn refresh_session(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<RefreshTokenBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    let token_hash = hash_opaque_token(body.refresh_token.trim());
    let status = consume_refresh_token(&tenant.pool, &token_hash)
        .await
        .map_err(ApiError::internal)?;
    let (user_id, family) = match status {
        RefreshTokenStatus::Consumed { user_id, family } => (user_id, family),
        RefreshTokenStatus::Reused { family_id } => {
            return Err(revoke_reused_family(&tenant, family_id).await);
        }
        RefreshTokenStatus::Invalid => return Err(ApiError::InvalidRefreshToken),
    };
    let user = find_user_by_id(&tenant.pool, user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidRefreshToken);
    };
    // Sessions issued while the tenant allowed unverified users stop renewing once it doesn't.
    if user.email_verified_at.is_none()
        && requires_email_verification(&state, tenant.tenant_id).await?
    {
        return Err(ApiError::EmailNotVerified);
    }

    Ok(Json(
        issue_session(&state, &tenant, SessionGrant { user, family }).await?,
    ))
}

/// A rotated token came back: either the client retried or the token was stolen.
/// We cannot tell which, so the whole session is revoked and the user must log in again.
async fn revoke_reused_family(tenant: &TenantContext, family_id: Uuid) -> ApiError {
    tracing::warn!(tenant_id = %tenant.tenant_id, %family_id, "refresh token reuse detected");

    if let Err(error) = revoke_token_family(&tenant.pool, family_id).await {
        return ApiError::internal(error);
    }

    ApiError::InvalidRefreshToken
}
