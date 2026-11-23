use sqlx::PgPool;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::user::user_account_updates::mark_email_verified;
use crate::modules::auth::user::user_events::record_user_event;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

pub async fn redeem_email_verification(
    pool: &PgPool,
    webhooks: &WebhookRecorder,
    (token, origin): (&str, RequestOrigin),
) -> Result<User, ApiError> {
    let mut transaction = pool.begin().await?;
    let purpose = OneTimeTokenPurpose::EmailVerification;
    let consumed = consume_one_time_token(&mut transaction, purpose, token).await?;
    let consumed = consumed.ok_or(AuthRejection::InvalidToken)?;
    let user = mark_email_verified(&mut transaction, consumed.user_id).await?;
    let user = user.ok_or(AuthRejection::InvalidToken)?;

    if user.banned_at.is_some() {
        return Err(TenantsRejection::UserBanned.into());
    }

    let event = (WebhookEventType::UserUpdated, &user);
    record_user_event(&mut transaction, webhooks, event).await?;
    let event = NewAuditEvent::by_user(AuditAction::EmailVerified, user.id, origin);
    insert_audit_event(&mut *transaction, event).await?;
    transaction.commit().await?;

    Ok(user)
}
