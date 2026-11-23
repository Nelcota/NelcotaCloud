use std::time::Instant;

use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use time::OffsetDateTime;

use crate::modules::database::usage::usage_entry::{UsageKey, hour_start};
use crate::modules::database::usage::usage_slot::UsageSlot;

const DATA_API_PREFIX: &str = "/rest/v1/";
/// Identifiers are at most 63 bytes; `rpc/` plus one, with room to spare.
const MAX_RESOURCE_LENGTH: usize = 80;

/// Counts every Data API response for its project: resource, method, status and duration.
pub async fn record_data_api_usage(mut request: Request, next: Next) -> Response {
    let started = Instant::now();
    let slot = UsageSlot::default();
    let method = request.method().as_str().to_owned();
    let resource = resource_of(request.uri().path());
    request.extensions_mut().insert(slot.clone());

    let response = next.run(request).await;

    let Some(target) = slot.target() else {
        return response;
    };
    let status = response.status();
    let key = UsageKey {
        tenant_id: target.tenant_id,
        hour_start: hour_start(OffsetDateTime::now_utc().unix_timestamp()),
        resource: known_resource(resource, status),
        method,
        status: status.as_u16(),
    };
    target.buffer.record(key, started.elapsed());

    response
}

/// `/rest/v1/todos` is `todos`, `/rest/v1/rpc/search` is `rpc/search`.
fn resource_of(path: &str) -> String {
    let name = path.strip_prefix(DATA_API_PREFIX).unwrap_or_default();

    name.chars().take(MAX_RESOURCE_LENGTH).collect()
}

/// A 404 means the name matched no table or function: it is not kept, so names a client
/// invents never become rows of statistics.
fn known_resource(resource: String, status: StatusCode) -> String {
    if status == StatusCode::NOT_FOUND {
        return String::new();
    }

    resource
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_the_table_or_function() {
        assert_eq!(resource_of("/rest/v1/todos"), "todos");
        assert_eq!(resource_of("/rest/v1/rpc/search"), "rpc/search");
        assert_eq!(resource_of("/other"), "");
        assert_eq!(
            resource_of(&format!("/rest/v1/{}", "a".repeat(200))).len(),
            80
        );
    }

    #[test]
    fn unknown_names_are_not_kept() {
        assert_eq!(known_resource("nope".to_owned(), StatusCode::NOT_FOUND), "");
        assert_eq!(known_resource("todos".to_owned(), StatusCode::OK), "todos");
    }
}
