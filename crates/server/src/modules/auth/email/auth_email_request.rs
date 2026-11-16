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

/// Answers 202 right after the rate limit, before looking the account up: neither the status
/// nor the response time can reveal whether the email has an account.
pub fn request_email_link(
    state: &AppState,
    tenant: TenantContext,
    request: EmailLinkRequest<'_>,
) -> Result<StatusCode, ApiError> {
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
    let job = EmailLinkJob {
        state: state.clone(),
        tenant,
        raw_email: request.raw_email.to_owned(),
        kind: request.kind,
    };
    // Failures are logged by `ApiError::internal` inside the job.
    tokio::spawn(job.run());

    Ok(StatusCode::ACCEPTED)
}

struct EmailLinkJob {
    state: AppState,
    tenant: TenantContext,
    raw_email: String,
    kind: AuthEmailKind,
}

impl EmailLinkJob {
    async fn run(self) -> Result<(), ApiError> {
        let Ok(email) = EmailAddress::parse(&self.raw_email) else {
            return Ok(());
        };
        let user = find_user_by_email(&self.tenant.pool, &email)
            .await
            .map_err(ApiError::internal)?;
        let Some(user) = user else {
            return Ok(());
        };

        if matches!(self.kind, AuthEmailKind::Verification) && user.email_verified_at.is_some() {
            return Ok(());
        }

        let request = AuthEmailRequest {
            user: &user,
            kind: self.kind,
        };

        send_auth_email(&self.state, &self.tenant, request).await
    }
}
