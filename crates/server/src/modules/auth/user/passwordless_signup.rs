use sqlx::PgPool;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_events::record_user_event;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_passwordless_user;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// The account of `email`, created without a password when there is none (magic links sign
/// people up).
pub async fn find_or_create_passwordless_user(
    pool: &PgPool,
    email: &EmailAddress,
    webhooks: &WebhookRecorder,
) -> Result<Option<User>, ApiError> {
    if let Some(user) = find_user_by_email(pool, email).await? {
        return Ok(Some(user));
    }

    let mut transaction = pool.begin().await?;

    if let Some(created) = insert_passwordless_user(&mut transaction, email).await? {
        let event = (WebhookEventType::UserCreated, &created);
        record_user_event(&mut transaction, webhooks, event).await?;
        transaction.commit().await?;
        return Ok(Some(created));
    }

    transaction.commit().await?;

    // Another request created the account meanwhile.
    Ok(find_user_by_email(pool, email).await?)
}
