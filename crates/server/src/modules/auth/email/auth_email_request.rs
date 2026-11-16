use std::net::IpAddr;

use axum::http::StatusCode;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// Body of the endpoints that email a link to an address.
#[derive(Deserialize, Validate)]
pub struct EmailBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
}

/// A client asking for a link to be emailed to `raw_email`.
pub struct EmailLinkRequest<'a> {
    pub raw_email: &'a str,
    pub client_ip: IpAddr,
    pub kind: AuthEmailKind,
}

/// Always answers 202, whether or not the account exists, so these endpoints cannot be used to
/// discover registered emails.
pub async fn request_email_link(
    state: &AppState,
    tenant: &TenantContext,
    request: EmailLinkRequest<'_>,
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
