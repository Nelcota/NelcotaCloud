use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::auth::email_address::EmailAddress;
use crate::auth::user_repository::find_user_by_email;
use crate::http::api_error::ApiError;
use crate::http::client_ip::ClientIp;
use crate::http::rate_limits::Attempt;
use crate::http::routes::auth_email_dispatch::{AuthEmailKind, AuthEmailRequest, send_auth_email};
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct EmailBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
}

/// `POST /recover`: emails a password reset link.
pub async fn recover_password(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    let request = EmailRequest {
        raw_email: &body.email,
        client_ip,
        kind: AuthEmailKind::PasswordReset,
    };

    request_auth_email(&state, &tenant, request).await
}

/// `POST /verify-email/resend`: emails a new verification link to an unverified account.
pub async fn resend_verification(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    let request = EmailRequest {
        raw_email: &body.email,
        client_ip,
        kind: AuthEmailKind::Verification,
    };

    request_auth_email(&state, &tenant, request).await
}

struct EmailRequest<'a> {
    raw_email: &'a str,
    client_ip: std::net::IpAddr,
    kind: AuthEmailKind,
}

/// Always answers 202, whether or not the account exists, so these endpoints cannot be used to
/// discover registered emails.
async fn request_auth_email(
    state: &AppState,
    tenant: &TenantContext,
    request: EmailRequest<'_>,
) -> Result<StatusCode, ApiError> {
    let kind = request.kind;
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: request.raw_email,
        client_ip: request.client_ip,
    };
    // Applies to unknown emails too, so the limit itself reveals nothing about accounts.
    state
        .rate_limits
        .email_delivery
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;
    let Ok(email) = EmailAddress::parse(request.raw_email) else {
        return Ok(StatusCode::ACCEPTED);
    };
    let user = find_user_by_email(&tenant.pool, &email)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Ok(StatusCode::ACCEPTED);
    };

    if matches!(kind, AuthEmailKind::Verification) && user.email_verified_at.is_some() {
        return Ok(StatusCode::ACCEPTED);
    }

    send_auth_email(state, tenant, AuthEmailRequest { user: &user, kind }).await?;

    Ok(StatusCode::ACCEPTED)
}
