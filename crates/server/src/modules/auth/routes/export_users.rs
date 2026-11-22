use axum::extract::Query;
use axum::http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use utoipa::IntoParams;
use validator::Validate;

use crate::modules::auth::user::user_export::export_users as find_users;
use crate::modules::auth::user::user_listing::UserFilters;
use crate::modules::auth::user::user_page_order::UserOrder;
use crate::modules::auth::user::user_status_filter::UserStatusFilter;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const CSV_CONTENT_TYPE: &str = "text/csv; charset=utf-8";
const CSV_DISPOSITION: &str = "attachment; filename=\"users.csv\"";

/// The list's filters and order without its paging.
#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UsersExportQuery {
    /// Part of the email to search for.
    #[validate(length(min = 1, max = 254))]
    pub email: Option<String>,
    /// Only users in this state; every user without it.
    #[param(inline)]
    pub status: Option<UserStatusFilter>,
    /// The order of the rows, as in the list.
    #[param(inline)]
    pub order: Option<UserOrder>,
}

/// `GET /admin/users/export`: streams the matching users as a CSV file.
///
/// Takes the same filters and order as the user list, so the file holds what the console shows.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/users/export",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(UsersExportQuery),
    responses(
        (status = 200, description = "The users as CSV", body = String, content_type = "text/csv"),
        (status = 400, description = "Invalid search, status or order", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn export_users(
    admin: TenantAdminContext,
    Query(query): Query<UsersExportQuery>,
) -> Result<Response, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let filters = UserFilters::new(query.email.as_deref(), query.status)
        .map_err(ApiError::invalid_request)?;
    let csv = find_users(admin.pool, &filters, query.order.unwrap_or_default());
    let headers = [
        (CONTENT_TYPE, CSV_CONTENT_TYPE),
        (CONTENT_DISPOSITION, CSV_DISPOSITION),
    ];

    Ok((headers, csv).into_response())
}
