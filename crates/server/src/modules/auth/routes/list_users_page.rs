use axum::Json;
use axum::extract::Query;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

use crate::modules::auth::user::user_listing::{UserCursorQuery, UserFilters, list_users_before};
use crate::modules::auth::user::user_page_order::UserOrder;
use crate::modules::auth::user::user_response::UserResponse;
use crate::modules::auth::user::user_status_filter::UserStatusFilter;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const DEFAULT_PAGE_SIZE: u16 = 50;

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UsersPageQuery {
    /// Part of the email to search for.
    #[validate(length(min = 1, max = 254))]
    pub email: Option<String>,
    /// Only users in this state; every user without it.
    #[param(inline)]
    pub status: Option<UserStatusFilter>,
    #[param(minimum = 1, maximum = 100)]
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<u16>,
    /// The previous response's `next_cursor`. Omit for the first page.
    #[validate(length(min = 1, max = 80))]
    pub before: Option<String>,
    /// The order of the list; a `before` cursor only continues the order it came from.
    #[param(inline)]
    pub order: Option<UserOrder>,
}

#[derive(Serialize, ToSchema)]
pub struct UserCursorPageResponse {
    pub users: Vec<UserResponse>,
    pub next_cursor: Option<String>,
}

/// Lists users newest first, or by most recent login, using a continuation cursor.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/users/page",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(UsersPageQuery),
    responses(
        (status = 200, description = "One page of users without a total count", body = UserCursorPageResponse),
        (status = 400, description = "Invalid search, status, order, limit or cursor", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_users_page(
    admin: TenantAdminContext,
    Query(query): Query<UsersPageQuery>,
) -> Result<Json<UserCursorPageResponse>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let filters = UserFilters::new(query.email.as_deref(), query.status)
        .map_err(ApiError::invalid_request)?;
    let order = query.order.unwrap_or_default();
    let before = query
        .before
        .as_deref()
        .map(|raw| order.parse_cursor(raw))
        .transpose()
        .map_err(ApiError::invalid_request)?;
    let page = list_users_before(
        &admin.pool,
        &UserCursorQuery {
            filters,
            order,
            before,
            limit: query.limit.unwrap_or(DEFAULT_PAGE_SIZE),
        },
    )
    .await?;

    Ok(Json(UserCursorPageResponse {
        users: page.users.into_iter().map(UserResponse::from).collect(),
        next_cursor: page.next_cursor.map(|cursor| cursor.to_string()),
    }))
}
