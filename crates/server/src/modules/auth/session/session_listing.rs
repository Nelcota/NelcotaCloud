use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::session::refresh_token_repository::revoke_token_family_with;
use crate::modules::auth::user::user_events::record_sessions_revoked;
use crate::modules::webhooks::event::webhook_event::RevokedSessions;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// One logged-in device or browser: a refresh token family that can still be used.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct SessionSummary {
    pub id: Uuid,
    #[serde(with = "time::serde::rfc3339")]
    pub started_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub last_refreshed_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub expires_at: OffsetDateTime,
    /// The session of the access token used for this request.
    #[sqlx(skip)]
    pub is_current: bool,
}

/// Sessions whose refresh token still works, most recently used first.
pub async fn list_active_sessions(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<SessionSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT token.family_id AS id, min(token.family_started_at) AS started_at, \
         max(token.created_at) AS last_refreshed_at, max(token.expires_at) AS expires_at \
         FROM refresh_tokens AS token JOIN users ON users.id = token.user_id \
         WHERE token.user_id = $1 AND token.revoked_at IS NULL AND token.expires_at > now() \
         AND (users.sessions_invalidated_at IS NULL OR token.family_started_at > users.sessions_invalidated_at) \
         AND NOT EXISTS (SELECT 1 FROM revoked_token_families revoked WHERE revoked.family_id = token.family_id) \
         GROUP BY token.family_id ORDER BY last_refreshed_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

/// Ends one session of the user; `false` when it is not theirs. Ending a session that already
/// ended (revoked or expired) changes nothing and sends no webhook.
pub async fn end_session_of_user(
    pool: &PgPool,
    (user_id, session_id): (Uuid, Uuid),
    webhooks: &WebhookRecorder,
) -> Result<bool, ApiError> {
    let mut transaction = pool.begin().await?;
    let session: Option<bool> = sqlx::query_scalar(
        "SELECT bool_or(revoked_at IS NULL AND expires_at > now()) FROM refresh_tokens \
         WHERE family_id = $1 AND user_id = $2 HAVING count(*) > 0",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_optional(&mut *transaction)
    .await?;
    let is_active = match session {
        Some(is_active) => is_active,
        None => return Ok(false),
    };

    if is_active == false {
        return Ok(true);
    }

    revoke_token_family_with(&mut transaction, session_id).await?;
    let revoked = (user_id, RevokedSessions::One, Some(session_id));
    record_sessions_revoked(&mut transaction, webhooks, revoked).await?;
    transaction.commit().await?;

    Ok(true)
}

/// Ends every session of the user except `kept_session_id` (log out other devices). Markers
/// keep those families revoked even for successors a concurrent refresh is inserting.
pub async fn end_other_sessions(
    pool: &PgPool,
    (user_id, kept_session_id): (Uuid, Uuid),
    webhooks: &WebhookRecorder,
) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;
    sqlx::query(
        "INSERT INTO revoked_token_families (family_id) \
         SELECT DISTINCT family_id FROM refresh_tokens WHERE user_id = $1 AND family_id <> $2 \
         ON CONFLICT (family_id) DO NOTHING",
    )
    .bind(user_id)
    .bind(kept_session_id)
    .execute(&mut *transaction)
    .await?;
    let ended = sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND family_id <> $2 AND revoked_at IS NULL",
    )
    .bind(user_id)
    .bind(kept_session_id)
    .execute(&mut *transaction)
    .await?;

    // No other session was open: nothing to report.
    if ended.rows_affected() == 0 {
        transaction.commit().await?;
        return Ok(());
    }

    let revoked = (user_id, RevokedSessions::Others, None);
    record_sessions_revoked(&mut transaction, webhooks, revoked).await?;
    transaction.commit().await?;

    Ok(())
}
