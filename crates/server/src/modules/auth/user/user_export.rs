use sqlx::PgPool;

use crate::modules::auth::user::user_listing::{UserFilters, user_rows};
use crate::modules::auth::user::user_page_order::UserOrder;
use crate::modules::auth::user::user_record::User;

/// The most rows one export holds, like the activity export: enough for a real project, and a
/// bound on the memory a request may use.
const MAX_EXPORT_ROWS: i64 = 100_000;

/// Every user the filters match, in the list's order, for the CSV export.
pub async fn export_users(
    pool: &PgPool,
    filters: &UserFilters<'_>,
    order: UserOrder,
) -> Result<Vec<User>, sqlx::Error> {
    let mut statement = user_rows(filters);
    statement
        .push(order.order_clause())
        .push_bind(MAX_EXPORT_ROWS);

    statement.build_query_as().fetch_all(pool).await
}
