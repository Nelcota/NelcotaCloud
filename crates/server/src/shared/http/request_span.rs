use axum::http::Request;
use tracing::Span;

/// The request span records the path but never the query string: OAuth redirects carry
/// authorization codes, states and API keys there, and logs must not keep them.
pub fn request_span<B>(request: &Request<B>) -> Span {
    let method = request.method();
    let path = request.uri().path();

    tracing::debug_span!("request", %method, path)
}
