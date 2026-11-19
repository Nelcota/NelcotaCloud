use axum::body::Bytes;
use axum::extract::{Path, RawQuery, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::routes::data_api::rows_response::rows_response;
use crate::modules::database::routes::data_api::write_request::write_request;
use crate::modules::database::rows::row_writing::{WriteKind, write_rows};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /rest/v1/{table}`: inserts one object or an array of up to 1000 objects.
///
/// `Prefer: resolution=merge-duplicates` (or `ignore-duplicates`) makes it an upsert on the
/// primary key or the `on_conflict` columns.
#[utoipa::path(
    post,
    path = "/rest/v1/{table}",
    tag = "database",
    security(("api_key" = []), ("api_key" = [], "bearer" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
        ("select" = Option<String>, Query, description = "Shape of the returned rows (with Prefer: return=representation)"),
        ("on_conflict" = Option<String>, Query, description = "Unique columns an upsert matches on"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "Rows inserted (the rows with Prefer: return=representation)", body = Vec<serde_json::Value>),
        (status = 400, description = "Invalid rows or a broken constraint", body = ErrorBody),
        (status = 403, description = "Refused by privileges or row level security", body = ErrorBody),
        (status = 404, description = "No such table", body = ErrorBody),
        (status = 409, description = "Duplicate or missing referenced row", body = ErrorBody),
    )
)]
pub async fn insert_rows(
    State(state): State<AppState>,
    caller: DataApiCaller,
    Path(table): Path<String>,
    RawQuery(query_string): RawQuery,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, ApiError> {
    let mut request = write_request(query_string.as_deref(), &headers, &body)?;
    let result = write_rows(
        &state.database_sessions(),
        &caller,
        request.write(WriteKind::Insert, &table),
    )
    .await?;

    rows_response(StatusCode::CREATED, result)
}
