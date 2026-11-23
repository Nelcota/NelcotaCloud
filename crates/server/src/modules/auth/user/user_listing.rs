use sqlx::{PgPool, Postgres, QueryBuilder};

use crate::modules::auth::user::user_page_order::{UserOrder, UserPageCursor, push_rows_after};
use crate::modules::auth::user::user_record::{User, user_columns};
use crate::modules::auth::user::user_status_filter::UserStatusFilter;
use crate::shared::text::contains_pattern::{contains_pattern, has_search_trigram};

const NEWEST_FIRST: &str = " ORDER BY created_at DESC, id DESC LIMIT ";

/// One page of users, newest first, and how many match in total.
#[derive(Debug)]
pub struct UserPage {
    pub users: Vec<User>,
    pub total: i64,
}

pub struct UserQuery<'a> {
    pub filters: UserFilters<'a>,
    pub limit: i64,
    pub offset: i64,
}

pub struct UserFilters<'a> {
    email_contains: Option<&'a str>,
    status: Option<UserStatusFilter>,
}

#[derive(Debug, thiserror::Error)]
#[error("email must not be blank")]
pub struct InvalidUserFilter;

impl<'a> UserFilters<'a> {
    pub fn new(
        email: Option<&'a str>,
        status: Option<UserStatusFilter>,
    ) -> Result<Self, InvalidUserFilter> {
        if email.is_some_and(|email| email.trim().is_empty()) {
            return Err(InvalidUserFilter);
        }

        Ok(Self {
            email_contains: email,
            status,
        })
    }
}

pub struct UserCursorQuery<'a> {
    pub filters: UserFilters<'a>,
    pub order: UserOrder,
    /// Must be a cursor of `order` (the route parses it with that order).
    pub before: Option<UserPageCursor>,
    pub limit: u16,
}

pub struct UserCursorPage {
    pub users: Vec<User>,
    pub next_cursor: Option<UserPageCursor>,
}

pub async fn list_users(pool: &PgPool, query: &UserQuery<'_>) -> Result<UserPage, sqlx::Error> {
    let users = read_user_rows(pool, query).await?;
    let mut total = QueryBuilder::new("SELECT count(*) FROM users WHERE true");
    push_filters(&mut total, &query.filters);
    let total = total.build_query_scalar().fetch_one(pool).await?;

    Ok(UserPage { users, total })
}

pub async fn list_users_before(
    pool: &PgPool,
    query: &UserCursorQuery<'_>,
) -> Result<UserCursorPage, sqlx::Error> {
    let mut statement = user_rows(&query.filters);

    if let Some(before) = &query.before {
        push_rows_after(&mut statement, before);
    }

    statement
        .push(query.order.order_clause())
        .push_bind(i64::from(query.limit).saturating_add(1));
    let mut users: Vec<User> = statement.build_query_as().fetch_all(pool).await?;
    let next_cursor = next_page_cursor(&mut users, usize::from(query.limit), query.order);

    Ok(UserCursorPage { users, next_cursor })
}

fn next_page_cursor(
    users: &mut Vec<User>,
    limit: usize,
    order: UserOrder,
) -> Option<UserPageCursor> {
    if users.len() <= limit {
        return None;
    }

    users.truncate(limit);
    users.last().map(|user| order.cursor_after(user))
}

async fn read_user_rows(pool: &PgPool, query: &UserQuery<'_>) -> Result<Vec<User>, sqlx::Error> {
    if query.limit == 0 {
        return Ok(Vec::new());
    }

    let mut statement = user_rows(&query.filters);
    statement
        .push(NEWEST_FIRST)
        .push_bind(query.limit)
        .push(" OFFSET ")
        .push_bind(query.offset);

    statement.build_query_as().fetch_all(pool).await
}

fn user_rows(filters: &UserFilters<'_>) -> QueryBuilder<Postgres> {
    filtered_user_rows(
        filters,
        concat!("SELECT ", user_columns!(), " FROM users WHERE true"),
    )
}

pub(super) fn filtered_user_rows(
    filters: &UserFilters<'_>,
    select: &'static str,
) -> QueryBuilder<Postgres> {
    let mut statement = QueryBuilder::new(select);
    push_filters(&mut statement, filters);

    statement
}

fn push_filters(statement: &mut QueryBuilder<Postgres>, filters: &UserFilters<'_>) {
    if let Some(email) = filters.email_contains {
        push_email_filter(statement, email);
    }

    let status_filter = match filters.status {
        Some(UserStatusFilter::Unverified) => " AND email_verified_at IS NULL",
        Some(UserStatusFilter::Banned) => " AND banned_at IS NOT NULL",
        None => return,
    };
    statement.push(status_filter);
}

fn push_email_filter(statement: &mut QueryBuilder<Postgres>, email: &str) {
    let pattern = contains_pattern(email);

    if has_search_trigram(email) {
        statement
            .push(" AND email LIKE ")
            .push_bind(pattern)
            .push(r" ESCAPE '\'");
        return;
    }

    // The Boolean test keeps generic plans from using GIN for patterns without search keys.
    statement
        .push(" AND (email LIKE ")
        .push_bind(pattern)
        .push(r" ESCAPE '\') IS TRUE");
}
