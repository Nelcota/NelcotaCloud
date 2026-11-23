use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::one_time_token::one_time_token_repository::invalidate_pending_tokens;
use crate::modules::auth::one_time_token::pending_magic_link::{
    clear_pending_magic_links, consume_pending_magic_link, pending_magic_link_email,
};
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, SessionRequest, TokenSigning};
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_events::record_user_event;
use crate::modules::auth::user::user_locks::{lock_user_by_email, lock_user_by_id};
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_verified_passwordless_user;
use crate::modules::auth::user::verified_inbox_claim::claim_verified_inbox;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::tenants::audit::login_method::LoginMethod;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::crypto::opaque_token::{TokenHash, hash_opaque_token};
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;
use sqlx::PgConnection;
use uuid::Uuid;

/// Trades the token from an emailed magic link for a session.
///
/// Opening the link proves control of the inbox, so an account nobody verified is claimed for
/// whoever opened it.
pub async fn redeem_magic_link(
    (signing, webhooks): (&TokenSigning<'_>, &WebhookRecorder),
    tenant: &TenantContext,
    (token, origin): (&str, RequestOrigin),
) -> Result<LoginResponse, ApiError> {
    let mut transaction = tenant.pool.begin().await?;
    let hash = hash_opaque_token(token.trim());
    let claimed = match pending_magic_link_email(&mut transaction, &hash).await? {
        Some(recipient) => {
            claim_pending_link(&mut transaction, webhooks, (recipient, &hash)).await?
        }
        None => (claim_legacy_link(&mut transaction, token).await?, false),
    };
    let (user, created) = claimed;

    if user.banned_at.is_some() {
        return Err(TenantsRejection::UserBanned.into());
    }

    clear_pending_magic_links(&mut transaction, &user.email).await?;
    let user = claim_verified_inbox(&mut transaction, user, webhooks).await?;

    if created {
        let event = NewAuditEvent::by_user(AuditAction::SignedUp, user.id, origin.clone());
        insert_audit_event(&mut *transaction, event).await?;
    }

    let user_id = user.id;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut transaction,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    let response = complete_login(signing, request).await?;

    if matches!(response, LoginResponse::Session(_)) {
        let event = NewAuditEvent {
            login_method: Some(LoginMethod::MagicLink),
            ..NewAuditEvent::by_user(AuditAction::LoggedIn, user_id, origin)
        };
        insert_audit_event(&mut *transaction, event).await?;
    }

    transaction.commit().await?;

    Ok(response)
}

async fn claim_legacy_link(connection: &mut PgConnection, token: &str) -> Result<User, ApiError> {
    let purpose = OneTimeTokenPurpose::MagicLink;
    let consumed = consume_one_time_token(connection, purpose, token)
        .await?
        .ok_or(AuthRejection::InvalidToken)?;

    Ok(lock_user_by_id(connection, consumed.user_id)
        .await?
        .ok_or(AuthRejection::InvalidToken)?)
}

async fn claim_pending_link(
    connection: &mut PgConnection,
    webhooks: &WebhookRecorder,
    ((email, user_id), hash): ((String, Option<Uuid>), &TokenHash),
) -> Result<(User, bool), ApiError> {
    let email = EmailAddress::parse(&email).map_err(ApiError::internal)?;
    let current = match user_id {
        Some(user_id) => Some(
            lock_user_by_id(connection, user_id)
                .await?
                .ok_or(AuthRejection::InvalidToken)?,
        ),
        None => lock_user_by_email(connection, &email).await?,
    };
    let (user, created) = match current {
        Some(user) => (user, false),
        None => match insert_verified_passwordless_user(connection, &email).await? {
            Some(user) => (user, true),
            None => (
                lock_user_by_email(connection, &email)
                    .await?
                    .ok_or(AuthRejection::InvalidToken)?,
                false,
            ),
        },
    };

    if consume_pending_magic_link(connection, hash).await? == false {
        return Err(AuthRejection::InvalidToken.into());
    }

    invalidate_pending_tokens(connection, user.id, OneTimeTokenPurpose::MagicLink).await?;

    if created {
        record_user_event(connection, webhooks, (WebhookEventType::UserCreated, &user)).await?;
    }

    Ok((user, created))
}
