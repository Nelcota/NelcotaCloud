use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::user_account_updates::set_password;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
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
    let mut transaction = pool.begin().await?;
    let origin = reset.origin.clone();
    let user_id = change_password(&mut transaction, reset).await?;
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    // The reset link also verifies the email, so the user may have changed for receivers.
    record_user_change(&mut transaction, webhooks, change).await?;
    transaction.commit().await?;

    let event = NewAuditEvent::by_user(AuditAction::PasswordReset, user_id, origin);
    record_audit_event(pool, event).await;
    Ok(())
}

async fn change_password(
    connection: &mut PgConnection,
    reset: PasswordReset<'_>,
) -> Result<Uuid, ApiError> {
    let purpose = OneTimeTokenPurpose::PasswordReset;
    let consumed = consume_one_time_token(&mut *connection, purpose, reset.token).await?;
    let consumed = consumed.ok_or(AuthRejection::InvalidToken)?;
    let user_id = consumed.user_id;
    let password_hash = hash_password(reset.password)
        .await
        .map_err(ApiError::internal)?;
    set_password(&mut *connection, user_id, &password_hash).await?;
    end_all_user_sessions(connection, user_id).await?;

    Ok(user_id)
}
