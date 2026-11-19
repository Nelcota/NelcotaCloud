use axum::body::Bytes;
use axum::extract::{Path, RawQuery, State};
use axum::http::HeaderMap;
use axum::response::Response;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::routes::data_api::rows_response::rows_response;
use crate::modules::database::routes::data_api::write_request::write_request;
use crate::modules::database::rows::row_writing::{WriteKind, write_rows};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `PATCH /rest/v1/{table}?<filters>`: sets the body's columns on every matching row. At
/// least one filter is required.
#[utoipa::path(
    patch,
    path = "/rest/v1/{table}",
    tag = "database",
    security(("api_key" = []), ("api_key" = [], "bearer" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
        ("select" = Option<String>, Query, description = "Shape of the returned rows (with Prefer: return=representation)"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "The updated rows (Prefer: return=representation)", body = Vec<serde_json::Value>),
        (status = 204, description = "Rows updated"),
        (status = 400, description = "Invalid values, no filter, or a broken constraint", body = ErrorBody),
        (status = 403, description = "Refused by privileges or row level security", body = ErrorBody),
        (status = 404, description = "No such table", body = ErrorBody),
    )
)]
pub async fn update_rows(
    State(state): State<AppState>,
    caller: DataApiCaller,
    Path(table): Path<String>,
    RawQuery(query_string): RawQuery,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, ApiError> {
    let mut request = write_request(query_string.as_deref(), &headers, &body)?;
    let status = request.success_status();
    let result = write_rows(
        &state.database_sessions(),
        &caller,
        request.write(WriteKind::Update, &table),
    )
    .await?;

    rows_response(status, result)
}
