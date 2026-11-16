use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::modules::auth::user::user_record::{User, user_columns};

/// One page of users, newest first, and how many match in total.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserPage {
    pub users: Vec<User>,
    pub total: i64,
}

pub struct UserQuery<'a> {
    /// Part of the email to search for; `None` lists everyone.
    pub email_contains: Option<&'a str>,
    pub limit: i64,
    pub offset: i64,
}

pub async fn list_users(pool: &PgPool, query: &UserQuery<'_>) -> Result<UserPage, sqlx::Error> {
    let pattern = like_pattern(query.email_contains);
    let users: Vec<User> = sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        r" FROM users WHERE email LIKE $1 ESCAPE '\' ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3"
    ))
    .bind(&pattern)
    .bind(query.limit)
    .bind(query.offset)
    .fetch_all(pool)
    .await?;
    let total: i64 =
        sqlx::query_scalar(r"SELECT count(*) FROM users WHERE email LIKE $1 ESCAPE '\'")
            .bind(&pattern)
            .fetch_one(pool)
            .await?;

    Ok(UserPage { users, total })
}

/// Emails are stored lowercase; `%` and `_` typed by the admin are matched literally.
fn like_pattern(email_contains: Option<&str>) -> String {
    let Some(text) = email_contains else {
        return "%".to_owned();
    };
    let escaped = text
        .trim()
        .to_lowercase()
        .replace('\\', r"\\")
        .replace('%', r"\%")
        .replace('_', r"\_");

    format!("%{escaped}%")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_everyone_without_a_search() {
        assert_eq!(like_pattern(None), "%");
    }

    #[test]
    fn escapes_wildcards_and_lowercases() {
        assert_eq!(like_pattern(Some(" Ana_100% ")), r"%ana\_100\%%");
    }
}
