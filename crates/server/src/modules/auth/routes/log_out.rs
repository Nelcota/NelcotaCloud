use axum::http::StatusCode;

use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::routes::refresh_token_body::RefreshTokenBody;
use crate::modules::auth::session::refresh_token_repository::revoke_family_of_token;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

/// Always answers 204, even for unknown tokens, so the endpoint cannot be used to probe tokens.
#[utoipa::path(
    post,
    path = "/auth/v1/logout",
    tag = "auth",
    security(("api_key" = [])),
    request_body = RefreshTokenBody,
    responses(
        (status = 204, description = "Session ended (also for unknown tokens)"),
    )
)]
pub async fn log_out(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<RefreshTokenBody>,
) -> Result<StatusCode, ApiError> {
    state
        .rate_limits
        .token_redemption
        .check(tenant.tenant_id, client_ip)?;
    let token_hash = hash_opaque_token(body.refresh_token.trim());
    revoke_family_of_token(&tenant.pool, &token_hash).await?;

    Ok(StatusCode::NO_CONTENT)
}
