use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::avatar::avatar_repository::{delete_avatar, store_avatar};
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

pub async fn save_avatar(
    pool: &PgPool,
    webhooks: &WebhookRecorder,
    (user_id, image): (Uuid, &[u8]),
) -> Result<OffsetDateTime, ApiError> {
    let mut transaction = pool.begin().await?;
    let updated_at = store_avatar(&mut *transaction, user_id, image)
        .await?
        .ok_or(TenantsRejection::InvalidAccessToken)?;
    record_user_change(&mut transaction, webhooks, avatar_change(user_id)).await?;
    transaction.commit().await?;

    Ok(updated_at)
}

pub async fn remove_avatar(
    pool: &PgPool,
    webhooks: &WebhookRecorder,
    user_id: Uuid,
) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;
    let user = lock_user_by_id(&mut transaction, user_id)
        .await?
        .ok_or(TenantsRejection::InvalidAccessToken)?;

    // A banned user's still-valid access token cannot change their photo.
    if user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    if delete_avatar(&mut *transaction, user_id).await? == false {
        return Ok(());
    }

    record_user_change(&mut transaction, webhooks, avatar_change(user_id)).await?;
    transaction.commit().await?;

    Ok(())
}

fn avatar_change(user_id: Uuid) -> UserChange {
    UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    }
}
