use axum::http::StatusCode;

use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::routes::refresh_token_body::RefreshTokenBody;
use crate::modules::auth::session::refresh_token_repository::revoke_family_of_token;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;
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
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<RefreshTokenBody>,
) -> Result<StatusCode, ApiError> {
    let client_ip = origin.client_ip;
    state
        .rate_limits
        .auth
        .check_redemption(tenant.tenant_id, client_ip)
        .await?;
    let token_hash = hash_opaque_token(body.refresh_token.trim());
    let mut transaction = tenant.pool.begin().await?;
    let owner = revoke_family_of_token(&mut transaction, &token_hash).await?;

    // An unknown or already used token still answers 204; only a real logout is recorded.
    if let Some(user_id) = owner {
        let event = NewAuditEvent::by_user(AuditAction::LoggedOut, user_id, origin);
        insert_audit_event(&mut *transaction, event).await?;
    }

    transaction.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}
