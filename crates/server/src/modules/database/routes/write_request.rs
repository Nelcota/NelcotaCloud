use axum::http::{HeaderMap, StatusCode};
use serde_json::Value;

use crate::modules::database::query::preferences::Preferences;
use crate::modules::database::query::query_string_parser::parse_query_string;
use crate::modules::database::query::read_query::ReadQuery;
use crate::modules::database::routes::rows_response::parse_json_body;
use crate::modules::database::rows::row_writing::{RowWrite, WriteKind};
use crate::shared::http::api_error::ApiError;

/// The parts every write request carries: filters and shape, preferences and body.
pub struct WriteRequest {
    query: ReadQuery,
    preferences: Preferences,
    body: Value,
}

pub fn write_request(
    query_string: Option<&str>,
    headers: &HeaderMap,
    body: &[u8],
) -> Result<WriteRequest, ApiError> {
    Ok(WriteRequest {
        query: parse_query_string(query_string.unwrap_or_default())?,
        preferences: Preferences::from_headers(headers),
        body: parse_json_body(body)?,
    })
}

impl WriteRequest {
    /// Hands the body over (moved, never copied: it may be megabytes of rows).
    pub fn write<'a>(&'a mut self, kind: WriteKind, table_name: &'a str) -> RowWrite<'a> {
        let body = std::mem::take(&mut self.body);

        RowWrite {
            kind,
            table_name,
            query: &self.query,
            preferences: &self.preferences,
            body,
        }
    }

    /// Updates and deletes answer 204 unless the rows were asked for.
    pub fn success_status(&self) -> StatusCode {
        match self.preferences.returns_rows {
            true => StatusCode::OK,
            false => StatusCode::NO_CONTENT,
        }
    }
}
