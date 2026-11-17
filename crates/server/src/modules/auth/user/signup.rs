use sqlx::PgConnection;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailLink, AuthEmailRequest, email_auth_link, send_auth_email,
};
use crate::modules::auth::one_time_token::one_time_token_repository::issue_one_time_token;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::unverified_account_takeover::take_over_unverified_account;
use crate::modules::auth::user::user_events::{UserChange, record_user_change, record_user_event};
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_user;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::email_verification_policy::requires_email_verification;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// A validated signup with its password already hashed.
pub struct NewSignup {
    pub email: EmailAddress,
    pub password_hash: String,
}

pub enum SignupOutcome {
    /// The tenant lets unverified users in: the account is created and logged in.
    Session(Box<SessionTokens>),
    /// Only a note to check the inbox, the same for new and already registered emails.
    VerificationPending,
}

pub async fn sign_up_user(
    state: &AppState,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<SignupOutcome, ApiError> {
    if requires_email_verification(&state.control_plane_pool, tenant.tenant_id).await? {
        sign_up_pending_verification(state, tenant, signup).await?;
        return Ok(SignupOutcome::VerificationPending);
    }

    let tokens = sign_up_with_session(state, tenant, signup).await?;

    Ok(SignupOutcome::Session(Box::new(tokens)))
}

async fn sign_up_with_session(
    state: &AppState,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<SessionTokens, ApiError> {
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let user = insert_user(&mut transaction, &signup.email, &signup.password_hash).await?;
    let Some(user) = user else {
        return Err(ApiError::from(AuthRejection::EmailTaken));
    };
    record_user_event(
        &mut transaction,
        &webhooks,
        (WebhookEventType::UserCreated, &user),
    )
    .await?;
    transaction.commit().await?;
    let mut connection = tenant.pool.acquire().await?;
    let verification = AuthEmailRequest {
        user: &user,
        kind: AuthEmailKind::Verification,
    };
    send_auth_email(&state.auth_mailer(), tenant, verification).await?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    issue_session_with(&state.token_signing(), request).await
}

/// Answers the same for new and already registered emails, so signup cannot be used to find
/// out which emails have accounts. An unverified account is taken over by this signup.
///
/// Registering (or taking over) and issuing the verification link share one transaction, so a
/// concurrent signup for the same email always invalidates the link this one issued.
async fn sign_up_pending_verification(
    state: &AppState,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> Result<(), ApiError> {
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let user = register_or_take_over(&mut transaction, signup, &webhooks).await?;
    let Some(user) = user else {
        return Ok(());
    };
    let token_request = AuthEmailKind::Verification.token_request(user.id);
    let token = issue_one_time_token(&mut *transaction, token_request).await?;
    transaction.commit().await?;
    let link = AuthEmailLink {
        user: &user,
        kind: AuthEmailKind::Verification,
        token: &token,
    };

    email_auth_link(&state.auth_mailer(), tenant.tenant_id, &link).await
}

/// `None` when the email belongs to an account that is already verified: nothing changes.
async fn register_or_take_over(
    transaction: &mut PgConnection,
    signup: &NewSignup,
    webhooks: &WebhookRecorder,
) -> Result<Option<User>, ApiError> {
    let email = &signup.email;
    let password_hash = &signup.password_hash;

    if let Some(user) = insert_user(transaction, email, password_hash).await? {
        record_user_event(
            transaction,
            webhooks,
            (WebhookEventType::UserCreated, &user),
        )
        .await?;
        return Ok(Some(user));
    }

    let taken_over = take_over_unverified_account(transaction, email, password_hash).await?;
    let Some(user) = taken_over else {
        return Ok(None);
    };
    // The new signup replaced the password and dropped any authenticator: read it again.
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id: user.id,
    };
    record_user_change(transaction, webhooks, change).await?;

    Ok(Some(user))
}
