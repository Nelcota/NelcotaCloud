use axum::http::HeaderValue;
use axum::http::header::CACHE_CONTROL;
use axum::response::Response;

const NO_STORE: HeaderValue = HeaderValue::from_static("no-store");

/// Responses carry tokens and personal data, so no browser, proxy or CDN may keep a copy
/// (RFC 6749, section 5.1). A route that sets its own `Cache-Control` keeps it.
pub async fn forbid_caching(mut response: Response) -> Response {
    let headers = response.headers_mut();

    if headers.contains_key(CACHE_CONTROL) == false {
        headers.insert(CACHE_CONTROL, NO_STORE);
    }

    response
}

#[cfg(test)]
mod tests {
    use axum::body::Body;

    use super::*;

    #[tokio::test]
    async fn adds_no_store_when_missing() {
        let response = forbid_caching(Response::new(Body::empty())).await;

        assert_eq!(response.headers().get(CACHE_CONTROL), Some(&NO_STORE));
    }

    #[tokio::test]
    async fn keeps_a_cache_control_set_by_the_route() {
        let public = HeaderValue::from_static("public, max-age=60");
        let mut response = Response::new(Body::empty());
        response.headers_mut().insert(CACHE_CONTROL, public.clone());

        let response = forbid_caching(response).await;

        assert_eq!(response.headers().get(CACHE_CONTROL), Some(&public));
    }
}
