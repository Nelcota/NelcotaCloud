use axum::http::Request;
use tracing::Span;
use tracing::field::{Empty, display};
use uuid::Uuid;

use crate::shared::http::request_id::request_id_of;

/// Name of the span field that holds the tenant, filled once the API key is resolved.
const TENANT_ID_FIELD: &str = "tenant_id";

/// One span per request, at INFO so production logs keep it.
///
/// Every event of the request (its background email jobs included) carries the method, the
/// path, the request id returned to the client in `x-request-id` and, once known, the tenant.
///
/// It records the path but never the query string: OAuth redirects carry authorization
/// codes, states and API keys there, and logs must not keep them.
pub fn request_span<B>(request: &Request<B>) -> Span {
    let method = request.method();
    let path = request.uri().path();
    let request_id = request_id_of(request);

    tracing::info_span!("request", %method, path, request_id, tenant_id = Empty)
}

/// Adds the tenant to the current request span.
pub fn record_tenant(tenant_id: Uuid) {
    Span::current().record(TENANT_ID_FIELD, display(tenant_id));
}
