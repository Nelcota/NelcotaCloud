use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::session::session_family::SessionFamily;

pub struct NewRefreshToken<'a> {
    pub user_id: Uuid,
    pub family: SessionFamily,
    pub token_hash: &'a [u8],
    /// Counted from the database clock, the one that checks expiry on use.
    pub lifetime_seconds: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefreshTokenStatus {
    /// The token was valid and is now revoked; the caller issues its successor.
    Consumed {
        user_id: Uuid,
        family: SessionFamily,
    },
    /// The token was already used: someone may hold a stolen copy.
    Reused { family_id: Uuid },
    /// Unknown, expired, or its session was ended.
    Invalid,
}

pub async fn insert_refresh_token(
    connection: &mut PgConnection,
    token: NewRefreshToken<'_>,
) -> Result<(), sqlx::Error> {
    let family = token.family;
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, family_started_at) \
         VALUES ($1, $2, $3, $4, now() + $5::bigint * interval '1 second', COALESCE($6, now()))",
    )
    .bind(Uuid::new_v4())
    .bind(token.user_id)
    .bind(family.id)
    .bind(token.token_hash)
    .bind(token.lifetime_seconds)
    .bind(family.started_at)
    .execute(connection)
    .await?;

    Ok(())
}

/// Consumes a refresh token, or reports it as reused or invalid.
///
/// Revokes the token in one conditional UPDATE, so two concurrent refreshes cannot both win.
/// It also refuses tokens whose family was revoked or whose user's sessions were ended, which
/// catches successors inserted by a refresh that raced with the revocation.
pub async fn consume_refresh_token(
    pool: &PgPool,
    token_hash: &[u8],
) -> Result<RefreshTokenStatus, sqlx::Error> {
    let consumed: Option<(Uuid, Uuid, OffsetDateTime)> = sqlx::query_as(
        "UPDATE refresh_tokens AS token SET revoked_at = now() FROM users \
         WHERE token.token_hash = $1 AND token.revoked_at IS NULL AND token.expires_at > now() \
         AND users.id = token.user_id \
         AND (users.sessions_invalidated_at IS NULL OR token.family_started_at > users.sessions_invalidated_at) \
         AND NOT EXISTS (SELECT 1 FROM revoked_token_families revoked WHERE revoked.family_id = token.family_id) \
         RETURNING token.user_id, token.family_id, token.family_started_at",
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?;

    if let Some((user_id, family_id, started_at)) = consumed {
        let family = SessionFamily {
            id: family_id,
            started_at: Some(started_at),
        };
        return Ok(RefreshTokenStatus::Consumed { user_id, family });
    }

    find_reused_family(pool, token_hash).await
}

async fn find_reused_family(
    pool: &PgPool,
    token_hash: &[u8],
) -> Result<RefreshTokenStatus, sqlx::Error> {
    let revoked_family: Option<Uuid> = sqlx::query_scalar(
        "SELECT family_id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NOT NULL",
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?;
    let Some(family_id) = revoked_family else {
        return Ok(RefreshTokenStatus::Invalid);
    };

    Ok(RefreshTokenStatus::Reused { family_id })
}

/// The marker keeps the family revoked even for tokens inserted after this call.
pub async fn revoke_token_family(pool: &PgPool, family_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO revoked_token_families (family_id) VALUES ($1) ON CONFLICT (family_id) DO NOTHING",
    )
    .bind(family_id)
    .execute(pool)
    .await?;
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL",
    )
    .bind(family_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Logout ends the whole session (every rotated token of the family), not just the one presented.
pub async fn revoke_family_of_token(pool: &PgPool, token_hash: &[u8]) -> Result<(), sqlx::Error> {
    let family_id: Option<Uuid> =
        sqlx::query_scalar("SELECT family_id FROM refresh_tokens WHERE token_hash = $1")
            .bind(token_hash)
            .fetch_optional(pool)
            .await?;
    let Some(family_id) = family_id else {
        return Ok(());
    };

    revoke_token_family(pool, family_id).await
}

/// Ends every session of the user, including ones being rotated right now: their successors
/// belong to families started before this moment and are refused when used.
pub async fn end_all_user_sessions(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET sessions_invalidated_at = now() WHERE id = $1")
        .bind(user_id)
        .execute(&mut *connection)
        .await?;
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(user_id)
    .execute(connection)
    .await?;

    Ok(())
}
