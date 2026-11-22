use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

pub async fn reset_factor_as_admin(
    pool: &PgPool,
    webhooks: &WebhookRecorder,
    (user_id, admin): (Uuid, (AdminActor, &RequestOrigin)),
) -> Result<bool, ApiError> {
    let mut transaction = pool.begin().await?;
    let user =
        crate::modules::auth::user::user_locks::lock_user_by_id(&mut transaction, user_id).await?;

    if user.is_none() {
        return Ok(false);
    }

    let deleted = delete_mfa_factor(&mut *transaction, user_id).await?;

    if deleted == false {
        return Ok(false);
    }

    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    record_user_change(&mut transaction, webhooks, change).await?;
    let event = NewAuditEvent::by_admin(AuditAction::MfaReset, user_id, admin);
    insert_audit_event(&mut *transaction, event).await?;
    transaction.commit().await?;

    Ok(true)
}
