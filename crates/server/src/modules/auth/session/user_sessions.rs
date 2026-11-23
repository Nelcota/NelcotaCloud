use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::session::session_listing::{SessionSummary, list_active_sessions};

/// What an admin sees of a user's sessions.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserSessions {
    /// When the user last logged in (by any method), even if that session has ended; `null`
    /// if they never did.
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_sign_in_at: Option<OffsetDateTime>,
    /// Sessions whose refresh token still works, most recently used first.
    pub sessions: Vec<SessionSummary>,
}

/// `None` if there is no such user.
pub async fn load_user_sessions(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<UserSessions>, sqlx::Error> {
    let last_sign_in: Option<Option<OffsetDateTime>> =
        sqlx::query_scalar("SELECT last_sign_in_at FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?;
    let last_sign_in_at = match last_sign_in {
        Some(last_sign_in_at) => last_sign_in_at,
        None => return Ok(None),
    };
    let sessions = list_active_sessions(pool, user_id).await?;

    Ok(Some(UserSessions {
        last_sign_in_at,
        sessions,
    }))
}
