use axum::body::Body;
use sqlx::{PgPool, types::Json};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::csv_stream::{csv_body, send_csv};
use crate::modules::auth::user::user_csv::{HEADER, write_user};
use crate::modules::auth::user::user_listing::{UserFilters, filtered_user_rows};
use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_page_order::UserOrder;

#[derive(sqlx::FromRow)]
pub(super) struct ExportUser {
    pub id: Uuid,
    pub email: String,
    pub email_verified_at: Option<OffsetDateTime>,
    pub banned_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    pub mfa_enabled: bool,
    pub name_fields: Json<MetadataObject>,
    pub last_sign_in_at: Option<OffsetDateTime>,
    pub has_password: bool,
    pub providers: Vec<String>,
}

const SELECT_USERS: &str =
    "SELECT id, email, email_verified_at, banned_at, created_at, last_sign_in_at,
     password_hash IS NOT NULL AS has_password,
     EXISTS (SELECT FROM mfa_factors WHERE user_id = users.id AND verified_at IS NOT NULL) AS mfa_enabled,
     ARRAY(SELECT provider FROM identities WHERE user_id = users.id ORDER BY provider) AS providers,
     jsonb_build_object('name', user_metadata->'name', 'full_name', user_metadata->'full_name') AS name_fields
     FROM users WHERE true";

/// Streams every matching user from a single PostgreSQL snapshot in the requested order.
pub fn export_users(pool: PgPool, filters: &UserFilters<'_>, order: UserOrder) -> Body {
    let mut statement = filtered_user_rows(filters, SELECT_USERS);
    statement.push(order.order_clause()).push("ALL");

    csv_body(move |sender| async move {
        let rows = statement.build_query_as().fetch(&pool);

        send_csv(sender, rows, &HEADER, write_user).await
    })
}
