use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailLink, AuthEmailRequest, email_auth_link, send_auth_email,
};
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::one_time_token::one_time_token_repository::issue_one_time_token;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, TokenSigning, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::signup_registration::{Registration, register_or_take_over};
use crate::modules::auth::user::user_events::record_user_event;
use crate::modules::auth::user::user_registration::insert_user;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::settings::email_verification_policy::requires_email_verification;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

/// A validated signup with its password already hashed.
pub struct NewSignup {
    pub email: EmailAddress,
    pub password_hash: String,
    pub origin: RequestOrigin,
}

pub enum SignupOutcome {
    /// The tenant lets unverified users in: the account is created and logged in.
    Session(Box<SessionTokens>),
    /// Only a note to check the inbox, the same for new and already registered emails.
    VerificationPending,
}

pub struct SignupServices<'a> {
    pub control_plane_pool: &'a PgPool,
    pub mailer: AuthMailer,
    pub signing: TokenSigning<'a>,
    pub webhooks: &'a WebhookRuntime,
}

pub async fn sign_up_user(
    services: &SignupServices<'_>,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<SignupOutcome, ApiError> {
    if requires_email_verification(services.control_plane_pool, tenant.tenant_id).await? {
        sign_up_pending_verification(services, tenant, signup).await?;
        return Ok(SignupOutcome::VerificationPending);
    }

    let tokens = sign_up_with_session(services, tenant, signup).await?;

    Ok(SignupOutcome::Session(Box::new(tokens)))
}

async fn sign_up_with_session(
    services: &SignupServices<'_>,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<SessionTokens, ApiError> {
    let webhooks = services.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let user = insert_user(&mut transaction, &signup.email, &signup.password_hash).await?;
    let user = user.ok_or(AuthRejection::EmailTaken)?;
    record_user_event(
        &mut transaction,
        &webhooks,
        (WebhookEventType::UserCreated, &user),
    )
    .await?;
    transaction.commit().await?;
    record_signup(tenant, user.id, signup).await;
    let mut connection = tenant.pool.acquire().await?;
    let verification = AuthEmailRequest {
        user: &user,
        kind: AuthEmailKind::Verification,
    };
    send_auth_email(&services.mailer, tenant, verification).await?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    issue_session_with(&services.signing, request).await
}

/// Answers the same for new and already registered emails, so signup cannot be used to find
/// out which emails have accounts. An unverified account is taken over by this signup.
///
/// Registering (or taking over) and issuing the verification link share one transaction, so a
/// concurrent signup for the same email always invalidates the link this one issued.
async fn sign_up_pending_verification(
    services: &SignupServices<'_>,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<(), ApiError> {
    let webhooks = services.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let registration = register_or_take_over(&mut transaction, signup, &webhooks).await?;
    let registration = match registration {
        Some(registration) => registration,
        None => return Ok(()),
    };
    let user = registration.user();
    let token_request = AuthEmailKind::Verification.token_request(user.id);
    let token = issue_one_time_token(&mut *transaction, token_request).await?;
    transaction.commit().await?;

    if let Registration::Created(created) = &registration {
        record_signup(tenant, created.id, signup).await;
    }

    let link = AuthEmailLink {
        user,
        kind: AuthEmailKind::Verification,
        token: &token,
    };

    email_auth_link(&services.mailer, tenant.tenant_id, &link).await
}

/// A new account only: taking over an unverified one is not a new signup.
async fn record_signup(tenant: &TenantContext, user_id: Uuid, signup: &NewSignup) {
    let origin = signup.origin.clone();
    let event = NewAuditEvent::by_user(AuditAction::SignedUp, user_id, origin);

    record_audit_event(&tenant.pool, event).await;
}
