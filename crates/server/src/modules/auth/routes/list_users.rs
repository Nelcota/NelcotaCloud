use axum::Json;
use axum::extract::Query;
use serde::Deserialize;
use utoipa::IntoParams;
use validator::Validate;

use crate::modules::auth::user::user_listing::{UserPage, UserQuery, list_users as find_users};
use crate::modules::auth::user::user_status_filter::UserStatusFilter;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const DEFAULT_PAGE_SIZE: i64 = 50;

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UserListQuery {
    /// Part of the email to search for.
    #[validate(length(min = 1, max = 254))]
    pub email: Option<String>,
    /// Only users in this state; every user without it.
    #[param(inline)]
    pub status: Option<UserStatusFilter>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<i64>,
    #[validate(range(min = 0, max = 100_000))]
    pub offset: Option<i64>,
}

/// `GET /admin/users`: the tenant's users, newest first, optionally searched by email
/// and narrowed to one status.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/users",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(UserListQuery),
    responses(
        (status = 200, description = "One page of users", body = UserPage),
        (status = 400, description = "Invalid search, status, limit or offset", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_users(
    admin: TenantAdminContext,
    Query(query): Query<UserListQuery>,
) -> Result<Json<UserPage>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;

    // Spaces only would become an empty pattern and silently list every user.
    if query
        .email
        .as_deref()
        .is_some_and(|email| email.trim().is_empty())
    {
        return Err(ApiError::invalid_request("email must not be blank"));
    }

    let user_query = UserQuery {
        email_contains: query.email.as_deref(),
        status: query.status,
        limit: query.limit.unwrap_or(DEFAULT_PAGE_SIZE),
        offset: query.offset.unwrap_or_default(),
    };
    let page = find_users(&admin.pool, &user_query).await?;

    Ok(Json(page))
}
