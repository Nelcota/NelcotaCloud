use sqlx::PgPool;
use sqlx::types::Json;
use uuid::Uuid;

use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_events::{UserEventError, record_user_event};
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;

#[derive(Debug, thiserror::Error)]
pub enum MetadataUpdateError {
    #[error("database error while updating user metadata: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Event(#[from] UserEventError),
}

/// New metadata for one user; a `None` document is left as it is, a given one replaces it whole.
pub struct MetadataChange {
    pub user_id: Uuid,
    pub user_metadata: Option<MetadataObject>,
    pub app_metadata: Option<MetadataObject>,
}

/// Replaces the given documents and reports `user.updated`, in one transaction.
///
/// `None` if there is no such user. Sending the documents the user already has changes nothing and reports
/// nothing. Access tokens issued before keep the old `app_metadata` until they expire.
pub async fn update_user_metadata(
    pool: &PgPool,
    change: MetadataChange,
    webhooks: &WebhookRecorder,
) -> Result<Option<StatusChange>, MetadataUpdateError> {
    let mut transaction = pool.begin().await?;
    let user: Option<User> = sqlx::query_as(concat!(
        "UPDATE users SET user_metadata = COALESCE($2, user_metadata), app_metadata = COALESCE($3, app_metadata), updated_at = now() WHERE id = $1 AND (user_metadata IS DISTINCT FROM COALESCE($2, user_metadata) OR app_metadata IS DISTINCT FROM COALESCE($3, app_metadata)) RETURNING ",
        user_columns!()
    ))
    .bind(change.user_id)
    .bind(change.user_metadata.map(Json))
    .bind(change.app_metadata.map(Json))
    .fetch_optional(&mut *transaction)
    .await?;
    let user = match user {
        Some(user) => user,
        None => {
            // Nothing changed, or no such user.
            let unchanged = find_user_by_id(&mut *transaction, change.user_id).await?;
            transaction.commit().await?;
            return Ok(unchanged.map(StatusChange::Unchanged));
        }
    };
    let event = (WebhookEventType::UserUpdated, &user);
    record_user_event(&mut transaction, webhooks, event).await?;
    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}
