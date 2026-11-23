use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::{
    consume_one_time_token, invalidate_pending_tokens, usable_token_exists,
};
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::user_account_updates::set_password;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

pub struct PasswordReset<'a> {
    pub token: &'a str,
    pub password: String,
    pub origin: RequestOrigin,
}

pub async fn redeem_password_reset(
    pool: &PgPool,
    webhooks: &WebhookRecorder,
    reset: PasswordReset<'_>,
) -> Result<(), ApiError> {
    let purpose = OneTimeTokenPurpose::PasswordReset;

    if usable_token_exists(pool, purpose, reset.token).await? == false {
        return Err(AuthRejection::InvalidToken.into());
    }

    let password_hash = hash_password(reset.password)
        .await
        .map_err(ApiError::internal)?;
    let mut transaction = pool.begin().await?;
    let user_id = change_password(&mut transaction, (reset.token, &password_hash)).await?;
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    // The reset link also verifies the email, so the user may have changed for receivers.
    record_user_change(&mut transaction, webhooks, change).await?;
    let event = NewAuditEvent::by_user(AuditAction::PasswordReset, user_id, reset.origin);
    insert_audit_event(&mut *transaction, event).await?;
    transaction.commit().await?;
    Ok(())
}

async fn change_password(
    connection: &mut PgConnection,
    (token, password_hash): (&str, &str),
) -> Result<Uuid, ApiError> {
    let purpose = OneTimeTokenPurpose::PasswordReset;
    let consumed = consume_one_time_token(&mut *connection, purpose, token).await?;
    let consumed = consumed.ok_or(AuthRejection::InvalidToken)?;
    let user_id = consumed.user_id;
    let user = lock_user_by_id(connection, user_id)
        .await?
        .ok_or(AuthRejection::InvalidToken)?;

    if user.banned_at.is_some() {
        return Err(TenantsRejection::UserBanned.into());
    }

    if user.email_verified_at.is_none() {
        delete_mfa_factor(&mut *connection, user_id).await?;
        invalidate_pending_tokens(connection, user_id, OneTimeTokenPurpose::EmailVerification)
            .await?;
    }

    set_password(&mut *connection, user_id, password_hash).await?;
    end_all_user_sessions(connection, user_id).await?;

    Ok(user_id)
}
