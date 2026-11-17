use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;

const BEARER_SCHEME: &str = "Bearer";

/// The token of an `Authorization: Bearer <token>` header; `None` when absent or blank.
pub fn bearer_token(parts: &Parts) -> Option<&str> {
    let header_text = parts.headers.get(AUTHORIZATION)?.to_str().ok()?;

    parse_bearer_token(header_text)
}

/// `Bearer <token>`. The scheme is case-insensitive (RFC 7235); a blank token is no token.
fn parse_bearer_token(header_text: &str) -> Option<&str> {
    let (scheme, token) = header_text.trim().split_once(' ')?;
    let token = token.trim();

    if scheme.eq_ignore_ascii_case(BEARER_SCHEME) == false || token.is_empty() {
        return None;
    }

    Some(token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_any_scheme_case() {
        for header in ["Bearer abc", "bearer abc", "BEARER  abc ", "  Bearer abc"] {
            assert_eq!(parse_bearer_token(header), Some("abc"));
        }
    }

    #[test]
    fn rejects_other_schemes_and_blank_tokens() {
        for header in [
            "",
            "Bearer",
            "Bearer ",
            "Bearer    ",
            "Basic abc",
            "Bearerabc",
            "abc",
        ] {
            assert_eq!(parse_bearer_token(header), None);
        }
    }
}
