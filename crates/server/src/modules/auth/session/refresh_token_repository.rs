use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

pub struct NewRefreshToken<'a> {
    pub user_id: Uuid,
    pub family_id: Uuid,
    pub token_hash: &'a [u8],
    pub expires_at: OffsetDateTime,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefreshTokenStatus {
    /// The token was valid and is now revoked; the caller issues its successor.
    Consumed { user_id: Uuid, family_id: Uuid },
    /// The token was already used: someone may hold a stolen copy.
    Reused { family_id: Uuid },
    /// Unknown or expired.
    Invalid,
}

pub async fn insert_refresh_token(
    pool: &PgPool,
    token: NewRefreshToken<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(token.user_id)
    .bind(token.family_id)
    .bind(token.token_hash)
    .bind(token.expires_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// Revokes the token in a single conditional UPDATE, so two concurrent refreshes cannot both win.
pub async fn consume_refresh_token(
    pool: &PgPool,
    token_hash: &[u8],
) -> Result<RefreshTokenStatus, sqlx::Error> {
    let consumed: Option<(Uuid, Uuid)> = sqlx::query_as(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING user_id, family_id",
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?;

    if let Some((user_id, family_id)) = consumed {
        return Ok(RefreshTokenStatus::Consumed { user_id, family_id });
    }

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

pub async fn revoke_token_family(pool: &PgPool, family_id: Uuid) -> Result<(), sqlx::Error> {
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
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL AND family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)",
    )
    .bind(token_hash)
    .execute(pool)
    .await?;

    Ok(())
}

/// Used after a password reset: every device must log in again with the new password.
pub async fn revoke_all_user_refresh_tokens(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}
