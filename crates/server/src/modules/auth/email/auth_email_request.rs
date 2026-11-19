use std::sync::Arc;

use serde::Deserialize;
use tracing::{Instrument, Span};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::rate_limiting::email_limiter::EmailLimiter;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::passwordless_signup::find_or_create_passwordless_user;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::captcha::captcha_requirement::{
    CaptchaAnswer, CaptchaRequirement, require_captcha,
};
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::rate_limiting::attempt_limiter::Attempt;

/// Body of the endpoints that email a link to an address.
#[derive(Deserialize, Validate, ToSchema)]
pub struct EmailBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    /// Cloudflare Turnstile token; required when the project turned the captcha on.
    #[validate(length(min = 1, max = 4096))]
    pub captcha_token: Option<String>,
}

/// A client asking for a link to be emailed to `raw_email`.
pub struct EmailLinkRequest<'a> {
    pub raw_email: &'a str,
    pub origin: RequestOrigin,
    pub kind: AuthEmailKind,
    pub captcha_token: Option<&'a str>,
}

pub struct EmailLinkDelivery<'a> {
    pub mailer: AuthMailer,
    pub webhooks: Arc<WebhookRuntime>,
    pub limiter: &'a EmailLimiter,
    pub captcha: CaptchaRequirement<'a>,
}

/// Returns before looking up the account so the request cannot reveal whether it exists.
pub async fn request_email_link(
    delivery: EmailLinkDelivery<'_>,
    tenant: TenantContext,
    request: &EmailLinkRequest<'_>,
) -> Result<(), ApiError> {
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: request.raw_email,
        client_ip: request.origin.client_ip,
    };
    // Applies to unknown emails too, so the limit itself reveals nothing about accounts.
    delivery.limiter.check(&attempt)?;
    let captcha = CaptchaAnswer {
        token: request.captcha_token,
        client_ip: request.origin.client_ip,
    };
    require_captcha(&delivery.captcha, tenant.tenant_id, captcha).await?;
    let job = EmailLinkJob {
        mailer: delivery.mailer,
        webhooks: delivery.webhooks,
        tenant,
        raw_email: request.raw_email.to_owned(),
        kind: request.kind,
        origin: request.origin.clone(),
    };
    // Failures are logged by `ApiError::internal` inside the job, under the request's span.
    tokio::spawn(job.run().instrument(Span::current()));

    Ok(())
}

struct EmailLinkJob {
    mailer: AuthMailer,
    webhooks: Arc<WebhookRuntime>,
    tenant: TenantContext,
    raw_email: String,
    kind: AuthEmailKind,
    origin: RequestOrigin,
}

impl EmailLinkJob {
    async fn run(self) -> Result<(), ApiError> {
        let email = match EmailAddress::parse(&self.raw_email) {
            Ok(email) => email,
            Err(_) => return Ok(()),
        };
        let user = match self.recipient(&email).await? {
            Some(user) => user,
            None => return Ok(()),
        };

        if is_skipped(self.kind, &user) {
            return Ok(());
        }

        let request = AuthEmailRequest {
            user: &user,
            kind: self.kind,
        };
        send_auth_email(&self.mailer, &self.tenant, request).await?;
        self.record_sent(user.id).await;

        Ok(())
    }

    /// Only for an email that went out: the client's answer is the same either way.
    async fn record_sent(&self, user_id: Uuid) {
        let action = match self.kind {
            AuthEmailKind::MagicLink => AuditAction::MagicLinkSent,
            AuthEmailKind::PasswordReset => AuditAction::PasswordResetRequested,
            AuthEmailKind::Verification => return,
        };
        let event = NewAuditEvent::by_user(action, user_id, self.origin.clone());

        record_audit_event(&self.tenant.pool, event).await;
    }

    /// Magic links also sign people up: an unknown email gets a passwordless account.
    async fn recipient(&self, email: &EmailAddress) -> Result<Option<User>, ApiError> {
        let pool = &self.tenant.pool;

        if self.kind == AuthEmailKind::MagicLink {
            let webhooks = self.webhooks.recorder(self.tenant.tenant_id).await?;
            return find_or_create_passwordless_user(pool, email, &webhooks).await;
        }

        find_user_by_email(pool, email)
            .await
            .map_err(ApiError::internal)
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
            user_metadata: sqlx::types::Json(serde_json::Map::new()),
            app_metadata: sqlx::types::Json(serde_json::Map::new()),
            last_sign_in_at: None,
            has_password: false,
            providers: Vec::new(),
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
