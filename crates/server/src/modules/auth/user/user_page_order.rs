use std::fmt;

use serde::Deserialize;
use sqlx::{Postgres, QueryBuilder};
use utoipa::ToSchema;

use crate::modules::auth::user::user_cursor::{InvalidUserCursor, UserCursor};
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_sign_in_cursor::{InvalidUserSignInCursor, UserSignInCursor};

/// The order of the admin user list.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum UserOrder {
    /// Newest accounts first.
    #[default]
    CreatedAt,
    /// Most recent login first; users who never logged in come last.
    LastSignIn,
}

/// Where a page continues, in the order it was listed in.
#[derive(Debug, PartialEq, Eq)]
pub enum UserPageCursor {
    Created(UserCursor),
    SignIn(UserSignInCursor),
}

#[derive(Debug, thiserror::Error)]
pub enum InvalidUserPageCursor {
    #[error(transparent)]
    Created(#[from] InvalidUserCursor),
    #[error(transparent)]
    SignIn(#[from] InvalidUserSignInCursor),
}

impl UserOrder {
    /// Reads a cursor of this order; a cursor of the other order is refused.
    pub fn parse_cursor(self, raw: &str) -> Result<UserPageCursor, InvalidUserPageCursor> {
        match self {
            Self::CreatedAt => Ok(UserPageCursor::Created(raw.parse()?)),
            Self::LastSignIn => Ok(UserPageCursor::SignIn(raw.parse()?)),
        }
    }

    pub fn cursor_after(self, user: &User) -> UserPageCursor {
        match self {
            Self::CreatedAt => UserPageCursor::Created(UserCursor::from(user)),
            Self::LastSignIn => UserPageCursor::SignIn(UserSignInCursor::from(user)),
        }
    }

    /// The `ORDER BY` of this order, ending in `LIMIT ` for the caller's bound limit.
    pub fn order_clause(self) -> &'static str {
        match self {
            Self::CreatedAt => " ORDER BY created_at DESC, id DESC LIMIT ",
            Self::LastSignIn => " ORDER BY last_sign_in_at DESC NULLS LAST, id DESC LIMIT ",
        }
    }
}

impl fmt::Display for UserPageCursor {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Created(cursor) => fmt::Display::fmt(cursor, formatter),
            Self::SignIn(cursor) => fmt::Display::fmt(cursor, formatter),
        }
    }
}

/// Keeps only the rows after the cursor, in the order the cursor belongs to.
pub fn push_rows_after(statement: &mut QueryBuilder<Postgres>, cursor: &UserPageCursor) {
    match cursor {
        UserPageCursor::Created(before) => {
            statement
                .push(" AND (created_at, id) < (")
                .push_bind(before.created_at)
                .push(", ")
                .push_bind(before.id)
                .push(")");
        }
        UserPageCursor::SignIn(before) => push_after_sign_in(statement, before),
    }
}

/// Descending with nulls last: later rows logged in earlier, at the same moment with a smaller
/// id, or never; after a user who never logged in, only others who never did with a smaller id.
fn push_after_sign_in(statement: &mut QueryBuilder<Postgres>, before: &UserSignInCursor) {
    let moment = match before.last_sign_in_at {
        Some(moment) => moment,
        None => {
            statement
                .push(" AND last_sign_in_at IS NULL AND id < ")
                .push_bind(before.id);
            return;
        }
    };

    statement
        .push(" AND (last_sign_in_at < ")
        .push_bind(moment)
        .push(" OR (last_sign_in_at = ")
        .push_bind(moment)
        .push(" AND id < ")
        .push_bind(before.id)
        .push(") OR last_sign_in_at IS NULL)");
}
