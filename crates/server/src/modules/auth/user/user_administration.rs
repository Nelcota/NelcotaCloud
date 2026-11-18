use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_events::{record_sessions_revoked, record_user_event};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::webhooks::event::webhook_event::RevokedSessions;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// Bans the user and ends every session, in one transaction that locks the user row before
/// the tokens (the order every user-changing path follows). `None` if there is no such user.
pub async fn ban_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
) -> Result<Option<StatusChange>, ApiError> {
    let mut transaction = pool.begin().await?;
    let Some(current) = lock_user_by_id(&mut transaction, user_id).await? else {
        return Ok(None);
    };

    if current.banned_at.is_some() {
        return Ok(Some(StatusChange::Unchanged(current)));
    }

    let user: User = sqlx::query_as(concat!(
        "UPDATE users SET banned_at = now(), updated_at = now() WHERE id = $1 RETURNING ",
        user_columns!()
    ))
    .bind(user_id)
    .fetch_one(&mut *transaction)
    .await?;
    end_all_user_sessions(&mut transaction, user_id).await?;
    let event = (WebhookEventType::UserBanned, &user);
    record_user_event(&mut transaction, webhooks, event).await?;
    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}

pub async fn unban_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
) -> Result<Option<StatusChange>, ApiError> {
    let mut transaction = pool.begin().await?;
    let Some(current) = lock_user_by_id(&mut transaction, user_id).await? else {
        return Ok(None);
    };

    if current.banned_at.is_none() {
        return Ok(Some(StatusChange::Unchanged(current)));
    }

    let user: User = sqlx::query_as(concat!(
        "UPDATE users SET banned_at = NULL, updated_at = now() WHERE id = $1 RETURNING ",
        user_columns!()
    ))
    .bind(user_id)
    .fetch_one(&mut *transaction)
    .await?;
    let event = (WebhookEventType::UserUnbanned, &user);
    record_user_event(&mut transaction, webhooks, event).await?;
    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}

/// Ends every session of the user (e.g. after a suspected compromise). `false` if no such user.
pub async fn end_sessions_of_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
) -> Result<bool, ApiError> {
    let mut transaction = pool.begin().await?;
    let locked: Option<Uuid> = sqlx::query_scalar("SELECT id FROM users WHERE id = $1 FOR UPDATE")
        .bind(user_id)
        .fetch_optional(&mut *transaction)
        .await?;

    if locked.is_none() {
        return Ok(false);
    }

    end_all_user_sessions(&mut transaction, user_id).await?;
    let revoked = (user_id, RevokedSessions::All, None);
    record_sessions_revoked(&mut transaction, webhooks, revoked).await?;
    transaction.commit().await?;

    Ok(true)
}

/// Deletes the user and, by cascade, their identities, tokens and sessions. `false` if no
/// such user. The event carries the user as it was just before.
pub async fn delete_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
) -> Result<bool, ApiError> {
    let mut transaction = pool.begin().await?;
    let user: Option<User> = sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE id = $1 FOR UPDATE"
    ))
    .bind(user_id)
    .fetch_optional(&mut *transaction)
    .await?;
    let Some(user) = user else {
        return Ok(false);
    };
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;
    record_user_event(
        &mut transaction,
        webhooks,
        (WebhookEventType::UserDeleted, &user),
    )
    .await?;
    transaction.commit().await?;

    Ok(true)
}
