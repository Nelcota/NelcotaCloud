use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::database::direct_connection::direct_connection_access::describe_connection;
use crate::modules::database::direct_connection::direct_connection_view::DirectConnectionView;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /database/v1/connection`: host, port, database and user for connecting to the
/// project's Postgres directly (ORMs, `psql`), without the password.
#[utoipa::path(
    get,
    path = "/database/v1/connection",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The connection details", body = DirectConnectionView),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_connection(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<DirectConnectionView>, ApiError> {
    Ok(Json(describe_connection(&state, admin.tenant_id).await?))
}
