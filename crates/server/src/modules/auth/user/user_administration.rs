use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::session::session_access::require_active_session;
use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_events::{record_sessions_revoked, record_user_event};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::storage::cleanup::owner_cleanup::schedule_owner_removal;
use crate::modules::team::member::account_removal::prepare_account_removal;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
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
    audit: NewAuditEvent,
) -> Result<Option<StatusChange>, ApiError> {
    let mut transaction = pool.begin().await?;
    let current = match lock_user_by_id(&mut transaction, user_id).await? {
        Some(current) => current,
        None => return Ok(None),
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
    insert_audit_event(&mut *transaction, audit).await?;
    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}

pub async fn unban_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
    audit: NewAuditEvent,
) -> Result<Option<StatusChange>, ApiError> {
    let mut transaction = pool.begin().await?;
    let current = match lock_user_by_id(&mut transaction, user_id).await? {
        Some(current) => current,
        None => return Ok(None),
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
    insert_audit_event(&mut *transaction, audit).await?;
    transaction.commit().await?;

    Ok(Some(StatusChange::Changed(user)))
}

/// Ends every session of the user (e.g. after a suspected compromise). `false` if no such user.
pub async fn end_sessions_of_user(
    pool: &PgPool,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
    audit: NewAuditEvent,
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
    insert_audit_event(&mut *transaction, audit).await?;
    transaction.commit().await?;

    Ok(true)
}

/// Deletes the user and, by cascade, their identities, tokens and sessions. `false` if no
/// such user. The event carries the user as it was just before.
pub async fn delete_user(
    state: &AppState,
    pool: &PgPool,
    (tenant_id, user_id): (Uuid, Uuid),
    session_id: Option<Uuid>,
    webhooks: &WebhookRecorder,
    audit: NewAuditEvent,
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
    let user = match user {
        Some(user) => user,
        None => return Ok(false),
    };
    if let Some(session_id) = session_id {
        require_active_session(&mut *transaction, user_id, session_id).await?;
    }

    let removal = prepare_account_removal(state, &mut transaction, tenant_id, user_id).await?;
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
    insert_audit_event(&mut *transaction, audit).await?;

    if removal.is_none() {
        schedule_owner_removal(&state.control_plane_pool, (tenant_id, user_id)).await?;
    }

    transaction.commit().await?;

    if let Some(removal) = removal
        && let Err(error) = removal.finish(pool, tenant_id).await
    {
        tracing::warn!(%error, "platform account membership cleanup will be retried");
    }

    Ok(true)
}
