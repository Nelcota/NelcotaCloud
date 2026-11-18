use axum::extract::{Path, RawQuery, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::query::preferences::Preferences;
use crate::modules::database::query::query_string_parser::parse_query_string;
use crate::modules::database::routes::rows_response::rows_response;
use crate::modules::database::rows::row_reading::{RowRead, read_rows as read_table_rows};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /rest/v1/{table}`: rows of a table of the project's `public` schema.
///
/// Query: `select=id,title,author(name)`, filters (`age=gte.18`, `or=(a.eq.1,b.eq.2)`),
/// `order=created_at.desc`, `limit` (at most 1000) and `offset`; embeds take the same with
/// their name as prefix (`comments.order=id.desc`). `Prefer: count=exact|planned` adds the
/// total to `Content-Range`.
#[utoipa::path(
    get,
    path = "/rest/v1/{table}",
    tag = "database",
    security(("api_key" = []), ("api_key" = [], "bearer" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table or view of the public schema"),
        ("select" = Option<String>, Query, description = "Columns and embeds to return"),
        ("order" = Option<String>, Query, description = "column.asc|desc[.nullsfirst|nullslast],..."),
        ("limit" = Option<u32>, Query, description = "Rows per page (at most 1000)"),
        ("offset" = Option<u32>, Query, description = "Rows to skip"),
    ),
    responses(
        (status = 200, description = "The rows", body = Vec<serde_json::Value>),
        (status = 400, description = "Invalid query", body = ErrorBody),
        (status = 403, description = "Refused by privileges or row level security", body = ErrorBody),
        (status = 404, description = "No such table", body = ErrorBody),
    )
)]
pub async fn read_rows(
    State(state): State<AppState>,
    caller: DataApiCaller,
    Path(table): Path<String>,
    RawQuery(query_string): RawQuery,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let query = parse_query_string(query_string.as_deref().unwrap_or_default())?;
    let preferences = Preferences::from_headers(&headers);
    let read = RowRead {
        table_name: &table,
        query: &query,
        preferences: &preferences,
    };
    let result = read_table_rows(&state, &caller, read).await?;

    rows_response(StatusCode::OK, result)
}
