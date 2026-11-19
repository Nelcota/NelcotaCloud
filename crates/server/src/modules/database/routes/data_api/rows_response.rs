use axum::body::Body;
use axum::http::header::{CONTENT_RANGE, CONTENT_TYPE};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::Value;

use crate::modules::database::rows::rows_result::RowsResult;
use crate::shared::http::api_error::ApiError;

const JSON: &str = "application/json";

/// The rows as the JSON Postgres built (never re-encoded here), with `Content-Range`:
/// `0-24/3573` (first-last/total, `*` when not counted) or `*/0` when empty.
pub fn rows_response(status: StatusCode, result: RowsResult) -> Result<Response, ApiError> {
    let content_range = content_range(&result);
    let mut response = match result.body {
        Some(body) => (status, body).into_response(),
        None => (status, Body::empty()).into_response(),
    };
    let headers = response.headers_mut();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static(JSON));
    let range = HeaderValue::from_str(&content_range).map_err(ApiError::internal)?;
    headers.insert(CONTENT_RANGE, range);

    Ok(response)
}

/// Result of a function call: JSON text from Postgres.
pub fn json_text_response(body: String) -> Response {
    ([(CONTENT_TYPE, HeaderValue::from_static(JSON))], body).into_response()
}

/// A request body as JSON; an empty body is `null`.
pub fn parse_json_body(bytes: &[u8]) -> Result<Value, ApiError> {
    if bytes.iter().all(u8::is_ascii_whitespace) {
        return Ok(Value::Null);
    }

    serde_json::from_slice(bytes)
        .map_err(|error| ApiError::invalid_request(format!("the body is not valid JSON: {error}")))
}

fn content_range(result: &RowsResult) -> String {
    let total = result
        .total
        .map(|total| total.to_string())
        .unwrap_or_else(|| "*".to_owned());

    if result.row_count <= 0 {
        return format!("*/{total}");
    }

    let first = i64::from(result.offset);
    let last = first.saturating_add(result.row_count).saturating_sub(1);

    format!("{first}-{last}/{total}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn result(row_count: i64, total: Option<i64>, offset: u32) -> RowsResult {
        RowsResult {
            body: None,
            row_count,
            total,
            offset,
        }
    }

    #[test]
    fn describes_the_page_and_total() {
        assert_eq!(content_range(&result(25, Some(3573), 0)), "0-24/3573");
        assert_eq!(content_range(&result(10, None, 40)), "40-49/*");
        assert_eq!(content_range(&result(0, Some(0), 0)), "*/0");
    }

    #[test]
    fn reads_empty_bodies_as_null() -> Result<(), ApiError> {
        assert_eq!(parse_json_body(b" ")?, Value::Null);
        assert!(parse_json_body(b"{").is_err());
        Ok(())
    }
}
