use oauth_providers::create_s256_code_challenge;

/// RFC 7636 bounds for verifiers.
const MIN_PKCE_LENGTH: usize = 43;
const MAX_PKCE_LENGTH: usize = 128;
/// An S256 challenge: a SHA-256 digest in unpadded base64url. Any other value never matches.
const S256_CHALLENGE_LENGTH: usize = 43;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error(
    "code_challenge must be an S256 challenge (43 characters of [A-Za-z0-9-_]), code_verifier 43-128 characters of [A-Za-z0-9-._~]"
)]
pub struct InvalidPkceValue;

/// Validates the app's PKCE challenge.
///
/// PKCE between the tenant's app and this server: the app sends the S256 challenge when it
/// starts the login and must present the matching verifier to redeem the login code, so a
/// stolen or injected code is useless to anyone but the app that started the flow.
pub fn parse_code_challenge(raw: &str) -> Result<String, InvalidPkceValue> {
    let challenge = raw.trim();

    if challenge.len() != S256_CHALLENGE_LENGTH {
        return Err(InvalidPkceValue);
    }

    if challenge.chars().all(is_base64url_character) == false {
        return Err(InvalidPkceValue);
    }

    Ok(challenge.to_owned())
}

pub fn verifier_matches(raw_verifier: &str, challenge: &str) -> bool {
    let verifier = raw_verifier.trim();

    if check_pkce_value(verifier).is_err() {
        return false;
    }

    create_s256_code_challenge(verifier) == challenge
}

fn check_pkce_value(value: &str) -> Result<(), InvalidPkceValue> {
    if (MIN_PKCE_LENGTH..=MAX_PKCE_LENGTH).contains(&value.len()) == false {
        return Err(InvalidPkceValue);
    }

    if value.chars().all(is_unreserved_character) == false {
        return Err(InvalidPkceValue);
    }

    Ok(())
}

fn is_base64url_character(character: char) -> bool {
    character.is_ascii_alphanumeric() || matches!(character, '-' | '_')
}

fn is_unreserved_character(character: char) -> bool {
    character.is_ascii_alphanumeric() || matches!(character, '-' | '.' | '_' | '~')
}

#[cfg(test)]
mod tests {
    use super::*;
    use oauth_providers::generate_code_verifier;

    #[test]
    fn accepts_the_matching_verifier_only() -> Result<(), InvalidPkceValue> {
        // The verifier and S256 challenge from RFC 7636, Appendix B.
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
        let stored_challenge = parse_code_challenge(challenge)?;
        let other_verifier = generate_code_verifier();

        assert!(verifier_matches(verifier, &stored_challenge));
        assert!(verifier_matches(&other_verifier, &stored_challenge) == false);
        Ok(())
    }

    #[test]
    fn rejects_malformed_values() {
        let too_long = "a".repeat(129);

        for raw in [
            "",
            "short",
            "has spaces in the middle of a long enough value here....",
            "a.long.enough.value.with.dots.is.no.challeng",
            too_long.as_str(),
        ] {
            assert_eq!(parse_code_challenge(raw), Err(InvalidPkceValue));
        }
    }

    #[test]
    fn rejects_a_verifier_equal_to_the_challenge() -> Result<(), InvalidPkceValue> {
        let challenge = create_s256_code_challenge(&generate_code_verifier());
        let stored_challenge = parse_code_challenge(&challenge)?;

        assert!(verifier_matches(&stored_challenge, &stored_challenge) == false);
        Ok(())
    }
}
