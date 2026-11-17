use std::net::IpAddr;

use axum::http::StatusCode;
use serde::Deserialize;
use tracing::{Instrument, Span};
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::passwordless_signup::find_or_create_passwordless_user;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// Body of the endpoints that email a link to an address.
#[derive(Deserialize, Validate, ToSchema)]
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
    request: &EmailLinkRequest<'_>,
) -> Result<StatusCode, ApiError> {
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: request.raw_email,
        client_ip: request.client_ip,
    };
    // Applies to unknown emails too, so the limit itself reveals nothing about accounts.
    state.rate_limits.email_delivery.check(&attempt)?;
    let job = EmailLinkJob {
        mailer: state.auth_mailer(),
        tenant,
        raw_email: request.raw_email.to_owned(),
        kind: request.kind,
    };
    // Failures are logged by `ApiError::internal` inside the job, under the request's span.
    tokio::spawn(job.run().instrument(Span::current()));

    Ok(StatusCode::ACCEPTED)
}

struct EmailLinkJob {
    mailer: AuthMailer,
    tenant: TenantContext,
    raw_email: String,
    kind: AuthEmailKind,
}

impl EmailLinkJob {
    async fn run(self) -> Result<(), ApiError> {
        let Ok(email) = EmailAddress::parse(&self.raw_email) else {
            return Ok(());
        };
        let Some(user) = self.recipient(&email).await? else {
            return Ok(());
        };

        if is_skipped(self.kind, &user) {
            return Ok(());
        }

        let request = AuthEmailRequest {
            user: &user,
            kind: self.kind,
        };

        send_auth_email(&self.mailer, &self.tenant, request).await
    }

    /// Magic links also sign people up: an unknown email gets a passwordless account.
    async fn recipient(&self, email: &EmailAddress) -> Result<Option<User>, ApiError> {
        let pool = &self.tenant.pool;
        let found = match self.kind {
            AuthEmailKind::MagicLink => find_or_create_passwordless_user(pool, email).await,
            AuthEmailKind::Verification | AuthEmailKind::PasswordReset => {
                find_user_by_email(pool, email).await
            }
        };

        found.map_err(ApiError::internal)
    }
}

/// Banned users get nothing, and verified users no new verification link.
fn is_skipped(kind: AuthEmailKind, user: &User) -> bool {
    let is_verification = matches!(kind, AuthEmailKind::Verification);

    user.banned_at.is_some() || (is_verification && user.email_verified_at.is_some())
}

#[cfg(test)]
mod tests {
    use time::OffsetDateTime;
    use uuid::Uuid;

    use super::*;

    fn user(is_banned: bool, is_verified: bool) -> User {
        let now = OffsetDateTime::now_utc();

        User {
            id: Uuid::new_v4(),
            email: "ana@example.com".to_owned(),
            email_verified_at: is_verified.then_some(now),
            banned_at: is_banned.then_some(now),
            created_at: now,
            mfa_enabled: false,
            avatar_updated_at: None,
        }
    }

    #[test]
    fn banned_users_get_no_email_of_any_kind() {
        for kind in [
            AuthEmailKind::Verification,
            AuthEmailKind::PasswordReset,
            AuthEmailKind::MagicLink,
        ] {
            assert!(is_skipped(kind, &user(true, false)), "{kind:?}");
        }
    }

    /// A verified user still gets reset and magic links; only a new verification link is useless.
    #[test]
    fn verified_users_get_every_link_but_verification() {
        let verified = user(false, true);

        assert!(is_skipped(AuthEmailKind::Verification, &verified));
        assert!(is_skipped(AuthEmailKind::PasswordReset, &verified) == false);
        assert!(is_skipped(AuthEmailKind::MagicLink, &verified) == false);
        assert!(is_skipped(AuthEmailKind::Verification, &user(false, false)) == false);
    }
}
