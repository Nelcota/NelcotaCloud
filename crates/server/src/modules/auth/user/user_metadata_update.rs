use sqlx::PgPool;
use sqlx::types::Json;
use uuid::Uuid;

use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_events::{UserEventError, record_user_event};
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
pub enum MetadataUpdateError {
    #[error("database error while updating user metadata: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Event(#[from] UserEventError),
    #[error("metadata changed since it was opened")]
    Stale,
}

impl From<MetadataUpdateError> for ApiError {
    fn from(error: MetadataUpdateError) -> Self {
        match error {
            MetadataUpdateError::Stale => Self::Conflict(error.to_string()),
            other => Self::internal(other),
        }
    }
}

/// New metadata for one user; a `None` document is left as it is, a given one replaces it whole.
pub struct MetadataChange {
    pub user_id: Uuid,
    pub user_metadata: Option<MetadataObject>,
    pub app_metadata: Option<MetadataObject>,
}

#[derive(Default)]
pub struct MetadataExpectations {
    pub user: Option<MetadataObject>,
    pub app: Option<MetadataObject>,
}

/// Replaces the given documents and reports `user.updated`, in one transaction.
///
/// `None` if there is no such user. Sending the documents the user already has changes nothing and reports
/// nothing. Access tokens issued before keep the old `app_metadata` until they expire.
pub async fn update_user_metadata(
    pool: &PgPool,
    change: MetadataChange,
    webhooks: &WebhookRecorder,
    (expected, audit): (MetadataExpectations, Option<NewAuditEvent>),
) -> Result<Option<StatusChange>, MetadataUpdateError> {
    let mut transaction = pool.begin().await?;
    let matches: Option<bool> = sqlx::query_scalar(
        "SELECT ($2::jsonb IS NULL OR user_metadata = $2)
             AND ($3::jsonb IS NULL OR app_metadata = $3)
         FROM users WHERE id = $1 FOR NO KEY UPDATE",
    )
    .bind(change.user_id)
    .bind(expected.user.map(Json))
    .bind(expected.app.map(Json))
    .fetch_optional(&mut *transaction)
    .await?;
    let Some(matches) = matches else {
        return Ok(None);
    };

    if matches == false {
        return Err(MetadataUpdateError::Stale);
    }

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
            let current = find_user_by_id(&mut *transaction, change.user_id).await?;
            transaction.commit().await?;

            return Ok(current.map(StatusChange::Unchanged));
        }
    };
    let event = (WebhookEventType::UserUpdated, &user);
    record_user_event(&mut transaction, webhooks, event).await?;

    if let Some(audit) = audit {
        insert_audit_event(&mut *transaction, audit).await?;
    }

    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}
