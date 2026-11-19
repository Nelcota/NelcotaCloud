use sqlx::PgConnection;

use crate::modules::auth::user::signup::NewSignup;
use crate::modules::auth::user::unverified_account_takeover::take_over_unverified_account;
use crate::modules::auth::user::user_events::{UserChange, record_user_change, record_user_event};
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_user;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// The account a signup ends up with: a new one, or an unverified one it took over.
pub enum Registration {
    Created(User),
    TakenOver(User),
}

impl Registration {
    pub fn user(&self) -> &User {
        match self {
            Self::Created(user) | Self::TakenOver(user) => user,
        }
    }
}

/// `None` when the email belongs to an account that is already verified: nothing changes.
pub async fn register_or_take_over(
    transaction: &mut PgConnection,
    signup: &NewSignup,
    webhooks: &WebhookRecorder,
) -> Result<Option<Registration>, ApiError> {
    let email = &signup.email;
    let password_hash = &signup.password_hash;

    if let Some(user) = insert_user(transaction, email, password_hash).await? {
        record_user_event(
            transaction,
            webhooks,
            (WebhookEventType::UserCreated, &user),
        )
        .await?;
        return Ok(Some(Registration::Created(user)));
    }

    let taken_over = take_over_unverified_account(transaction, email, password_hash).await?;
    let user = match taken_over {
        Some(user) => user,
        None => return Ok(None),
    };
    // The new signup replaced the password and dropped any authenticator: read it again.
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id: user.id,
    };
    record_user_change(transaction, webhooks, change).await?;

    Ok(Some(Registration::TakenOver(user)))
}
