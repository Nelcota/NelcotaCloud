use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::login::mfa_challenge_redemption::{
    ChallengeAnswer, redeem_mfa_challenge,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::audit::login_method::LoginMethod;
use crate::modules::tenants::ip_blocks::address_guard::ensure_address_allowed;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct MfaChallengeBody {
    /// The `mfa_token` returned by the login.
    #[validate(length(min = 1, max = 256))]
    pub mfa_token: String,
    #[validate(length(min = 6, max = 10))]
    pub code: String,
}

/// `POST /mfa/challenge`: the second step of a login with MFA on. Each challenge allows a few
/// wrong codes; after that the login starts over.
#[utoipa::path(
    post,
    path = "/auth/v1/mfa/challenge",
    tag = "mfa",
    security(("api_key" = [])),
    request_body = MfaChallengeBody,
    responses(
        (status = 200, description = "Logged in", body = SessionTokens),
        (status = 400, description = "Unknown, expired or exhausted MFA token", body = ErrorBody),
        (status = 401, description = "Wrong code", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn complete_mfa_challenge(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<MfaChallengeBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    ensure_address_allowed(&tenant.pool, origin.client_ip).await?;
    let answer = ChallengeAnswer {
        mfa_token: &body.mfa_token,
        code: &body.code,
        origin: origin.clone(),
    };

    let access = state.factor_code_access();
    let signing = state.token_signing();
    let tokens = redeem_mfa_challenge((&access, &signing), &tenant, answer).await?;
    let event = NewAuditEvent {
        login_method: Some(LoginMethod::Totp),
        ..NewAuditEvent::by_user(AuditAction::LoggedIn, tokens.user.id, origin)
    };
    record_audit_event(&tenant.pool, event).await;

    Ok(Json(tokens))
}
