use sqlx::PgPool;
use sqlx::types::Json;
use uuid::Uuid;

use crate::modules::auth::user::user_events::record_user_event;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

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
) -> Result<Option<User>, ApiError> {
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
    let Some(user) = user else {
        // Nothing changed, or no such user.
        let unchanged = find_user_by_id(&mut *transaction, change.user_id).await?;
        transaction.commit().await?;
        return Ok(unchanged);
    };
    let event = (WebhookEventType::UserUpdated, &user);
    record_user_event(&mut transaction, webhooks, event).await?;
    transaction.commit().await?;

    Ok(Some(user))
}
