use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::auth::user::user_status_filter::UserStatusFilter;

/// Search and status filter shared by the page and its count; `$2` is the status or `NULL`.
macro_rules! user_filter {
    () => {
        r" WHERE email LIKE $1 ESCAPE '\' AND ($2::text IS NULL OR ($2 = 'unverified' AND email_verified_at IS NULL) OR ($2 = 'banned' AND banned_at IS NOT NULL))"
    };
}

/// One page of users, newest first, and how many match in total.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserPage {
    pub users: Vec<User>,
    pub total: i64,
}

pub struct UserQuery<'a> {
    /// Part of the email to search for; `None` lists everyone.
    pub email_contains: Option<&'a str>,
    /// `None` lists every status.
    pub status: Option<UserStatusFilter>,
    pub limit: i64,
    pub offset: i64,
}

pub async fn list_users(pool: &PgPool, query: &UserQuery<'_>) -> Result<UserPage, sqlx::Error> {
    let pattern = like_pattern(query.email_contains);
    let status = query.status.map(UserStatusFilter::as_str);
    let users: Vec<User> = sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users",
        user_filter!(),
        " ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&pattern)
    .bind(status)
    .bind(query.limit)
    .bind(query.offset)
    .fetch_all(pool)
    .await?;
    let total: i64 = sqlx::query_scalar(concat!("SELECT count(*) FROM users", user_filter!()))
        .bind(&pattern)
        .bind(status)
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
