use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::modules::webhooks::event::webhook_event::{RevokedSessions, WebhookEvent};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// Something that happened to a user, to be sent to the tenant's webhook endpoints.
pub struct UserChange {
    pub event_type: WebhookEventType,
    pub user_id: Uuid,
}

/// Records the event with the user as it is now, read inside the caller's transaction so the
/// payload shows exactly what commits. Skips the read when no endpoint wants the event.
pub async fn record_user_change(
    connection: &mut PgConnection,
    webhooks: &WebhookRecorder,
    change: UserChange,
) -> Result<(), ApiError> {
    if webhooks.wants(change.event_type) == false {
        return Ok(());
    }

    let user = find_user_by_id(&mut *connection, change.user_id).await?;
    let Some(user) = user else {
        return Ok(());
    };

    record_user_event(connection, webhooks, (change.event_type, &user)).await
}

/// Records the event with a user the caller already has (e.g. returned by the change itself).
pub async fn record_user_event(
    connection: &mut PgConnection,
    webhooks: &WebhookRecorder,
    (event_type, user): (WebhookEventType, &User),
) -> Result<(), ApiError> {
    let event = WebhookEvent::about_user(event_type, user).map_err(ApiError::internal)?;

    Ok(webhooks.record(connection, event).await?)
}

/// Sessions a user or an admin ended on purpose (a plain sign out is not reported).
pub async fn record_sessions_revoked(
    connection: &mut PgConnection,
    webhooks: &WebhookRecorder,
    (user_id, scope, session_id): (Uuid, RevokedSessions, Option<Uuid>),
) -> Result<(), ApiError> {
    let event = WebhookEvent::sessions_revoked(user_id, scope, session_id);

    Ok(webhooks.record(connection, event).await?)
}
