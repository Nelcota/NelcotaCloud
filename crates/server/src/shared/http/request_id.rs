use axum::http::{HeaderName, HeaderValue, Request};
use uuid::Uuid;

/// Sent back on every response, so a user can report the id of a failed request.
pub const REQUEST_ID_HEADER: HeaderName = HeaderName::from_static("x-request-id");

/// Always a fresh id: one sent by the client would let anyone choose what our logs show.
pub fn generate_request_id<B>(_request: &Request<B>) -> Option<HeaderValue> {
    let request_id = Uuid::new_v4().hyphenated().to_string();

    // A hyphenated UUID is always a valid header value; `None` would only skip the header.
    HeaderValue::try_from(request_id).ok()
}

/// The id set by `generate_request_id`, or an empty string if the layer did not run.
pub fn request_id_of<B>(request: &Request<B>) -> &str {
    let Some(header_value) = request.headers().get(REQUEST_ID_HEADER) else {
        return "";
    };
    let Ok(request_id) = header_value.to_str() else {
        return "";
    };

    request_id
}

#[cfg(test)]
mod tests {
    use axum::body::Body;

    use super::*;

    #[test]
    fn generates_a_uuid() {
        let request = Request::new(Body::empty());
        let header_value = generate_request_id(&request);
        let request_id = header_value.as_ref().map(HeaderValue::to_str);

        assert!(matches!(request_id, Some(Ok(id)) if Uuid::parse_str(id).is_ok()));
    }

    #[test]
    fn reads_the_request_id_header() {
        let mut request = Request::new(Body::empty());
        let header_value = HeaderValue::from_static("abc");
        request
            .headers_mut()
            .insert(REQUEST_ID_HEADER, header_value);

        assert_eq!(request_id_of(&request), "abc");
    }
}
