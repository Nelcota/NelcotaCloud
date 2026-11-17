use axum::extract::{Path, RawQuery, State};
use axum::http::HeaderMap;
use axum::response::Response;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::routes::rows_response::rows_response;
use crate::modules::database::routes::write_request::write_request;
use crate::modules::database::rows::row_writing::{WriteKind, write_rows};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /rest/v1/{table}?<filters>`: deletes every matching row. At least one filter is
/// required.
#[utoipa::path(
    delete,
    path = "/rest/v1/{table}",
    tag = "database",
    security(("api_key" = []), ("api_key" = [], "bearer" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
        ("select" = Option<String>, Query, description = "Shape of the returned rows (with Prefer: return=representation)"),
    ),
    responses(
        (status = 200, description = "The deleted rows (Prefer: return=representation)", body = Vec<serde_json::Value>),
        (status = 204, description = "Rows deleted"),
        (status = 400, description = "No filter", body = ErrorBody),
        (status = 403, description = "Refused by privileges or row level security", body = ErrorBody),
        (status = 404, description = "No such table", body = ErrorBody),
        (status = 409, description = "Rows still referenced by other rows", body = ErrorBody),
    )
)]
pub async fn delete_rows(
    State(state): State<AppState>,
    caller: DataApiCaller,
    Path(table): Path<String>,
    RawQuery(query_string): RawQuery,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let mut request = write_request(query_string.as_deref(), &headers, &[])?;
    let status = request.success_status();
    let result = write_rows(&state, &caller, request.write(WriteKind::Delete, &table)).await?;

    rows_response(status, result)
}
