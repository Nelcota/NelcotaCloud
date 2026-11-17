use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::user::user_record::{User, user_columns};

/// A rotated token presented again within this many seconds is refused but not treated as
/// stolen (a racing tab or retry); later, it ends the whole session.
const REUSE_GRACE_SECONDS: f64 = 10.0;

pub struct NewRefreshToken<'a> {
    pub user_id: Uuid,
    pub family: SessionFamily,
    pub token_hash: &'a [u8],
    /// Counted from the database clock, the one that checks expiry on use.
    pub lifetime_seconds: i64,
}

#[derive(Debug)]
pub enum RefreshTokenStatus {
    /// The token was valid and is now revoked; the caller issues its successor. The user is
    /// read in the same statement, so a refresh costs no second lookup.
    Consumed { user: User, family: SessionFamily },
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

const CONSUME_REFRESH_TOKEN: &str = concat!(
    "WITH consumed AS (UPDATE refresh_tokens AS token SET revoked_at = now() FROM users \
     WHERE token.token_hash = $1 AND token.revoked_at IS NULL AND token.expires_at > now() \
     AND users.id = token.user_id AND users.banned_at IS NULL \
     AND (users.sessions_invalidated_at IS NULL OR token.family_started_at > users.sessions_invalidated_at) \
     AND NOT EXISTS (SELECT 1 FROM revoked_token_families revoked WHERE revoked.family_id = token.family_id) \
     RETURNING token.user_id, token.family_id, token.family_started_at)      SELECT ",
    user_columns!(),
    ", consumed.family_id AS consumed_family_id,      consumed.family_started_at AS consumed_family_started_at      FROM users JOIN consumed ON users.id = consumed.user_id"
);

/// A consumed token's user and session family.
#[derive(sqlx::FromRow)]
struct ConsumedToken {
    #[sqlx(flatten)]
    user: User,
    consumed_family_id: Uuid,
    consumed_family_started_at: OffsetDateTime,
}

/// Consumes a refresh token, or reports it as reused or invalid.
///
/// Revokes the token in one conditional UPDATE, so two concurrent refreshes cannot both win.
/// It also refuses tokens whose family was revoked, whose user's sessions were ended or whose
/// user is banned, which catches successors inserted by a login that raced with the revocation.
pub async fn consume_refresh_token(
    pool: &PgPool,
    token_hash: &[u8],
) -> Result<RefreshTokenStatus, sqlx::Error> {
    let consumed: Option<ConsumedToken> = sqlx::query_as(CONSUME_REFRESH_TOKEN)
        .bind(token_hash)
        .fetch_optional(pool)
        .await?;

    let Some(consumed) = consumed else {
        return find_reused_family(pool, token_hash).await;
    };
    let family = SessionFamily {
        id: consumed.consumed_family_id,
        started_at: Some(consumed.consumed_family_started_at),
    };

    Ok(RefreshTokenStatus::Consumed {
        user: consumed.user,
        family,
    })
}

async fn find_reused_family(
    pool: &PgPool,
    token_hash: &[u8],
) -> Result<RefreshTokenStatus, sqlx::Error> {
    // A token rotated moments ago is most likely a second tab or a retried request racing the
    // rotation, not a thief: it is refused without ending the session the user still holds.
    let revoked_family: Option<(Uuid, bool)> = sqlx::query_as(
        "SELECT family_id, revoked_at > now() - make_interval(secs => $2)          FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NOT NULL",
    )
    .bind(token_hash)
    .bind(REUSE_GRACE_SECONDS)
    .fetch_optional(pool)
    .await?;
    let Some((family_id, is_within_grace)) = revoked_family else {
        return Ok(RefreshTokenStatus::Invalid);
    };

    if is_within_grace {
        return Ok(RefreshTokenStatus::Invalid);
    }

    Ok(RefreshTokenStatus::Reused { family_id })
}

/// The marker keeps the family revoked even for tokens inserted after this call.
pub async fn revoke_token_family(pool: &PgPool, family_id: Uuid) -> Result<(), sqlx::Error> {
    let mut connection = pool.acquire().await?;

    revoke_token_family_with(&mut connection, family_id).await
}

/// Same as [`revoke_token_family`], inside the caller's transaction.
pub async fn revoke_token_family_with(
    connection: &mut PgConnection,
    family_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO revoked_token_families (family_id) VALUES ($1) ON CONFLICT (family_id) DO NOTHING",
    )
    .bind(family_id)
    .execute(&mut *connection)
    .await?;
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL",
    )
    .bind(family_id)
    .execute(connection)
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
    .execute(&mut *connection)
    .await?;
    // A pending MFA step was opened with the old credentials: it must not start a session.
    sqlx::query("DELETE FROM mfa_challenges WHERE user_id = $1")
        .bind(user_id)
        .execute(connection)
        .await?;

    Ok(())
}
