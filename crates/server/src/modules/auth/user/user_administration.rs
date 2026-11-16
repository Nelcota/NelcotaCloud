use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::user_record::{User, user_columns};

/// Bans the user and ends every session, in one transaction that locks the user row before
/// the tokens (the order every user-changing path follows). `None` if there is no such user.
pub async fn ban_user(pool: &PgPool, user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let user: Option<User> = sqlx::query_as(concat!(
        "UPDATE users SET banned_at = COALESCE(banned_at, now()), updated_at = now() WHERE id = $1 RETURNING ",
        user_columns!()
    ))
    .bind(user_id)
    .fetch_optional(&mut *transaction)
    .await?;
    let Some(user) = user else {
        return Ok(None);
    };
    end_all_user_sessions(&mut transaction, user_id).await?;
    transaction.commit().await?;

    Ok(Some(user))
}

pub async fn unban_user(pool: &PgPool, user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "UPDATE users SET banned_at = NULL, updated_at = now() WHERE id = $1 RETURNING ",
        user_columns!()
    ))
    .bind(user_id)
    .fetch_optional(pool)
    .await
}

/// Ends every session of the user (e.g. after a suspected compromise). `false` if no such user.
pub async fn end_sessions_of_user(pool: &PgPool, user_id: Uuid) -> Result<bool, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let locked: Option<Uuid> = sqlx::query_scalar("SELECT id FROM users WHERE id = $1 FOR UPDATE")
        .bind(user_id)
        .fetch_optional(&mut *transaction)
        .await?;

    if locked.is_none() {
        return Ok(false);
    }

    end_all_user_sessions(&mut transaction, user_id).await?;
    transaction.commit().await?;

    Ok(true)
}

/// Deletes the user and, by cascade, their identities, tokens and sessions. `false` if no
/// such user.
pub async fn delete_user(pool: &PgPool, user_id: Uuid) -> Result<bool, sqlx::Error> {
    let deleted: Option<Uuid> = sqlx::query_scalar("DELETE FROM users WHERE id = $1 RETURNING id")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

    Ok(deleted.is_some())
}
