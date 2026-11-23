use hmac::digest::CtOutput;
use sha2::Sha256;
use uuid::Uuid;

use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;

const TOKEN_PREFIX: &str = "nc_cache_";
const TOKEN_SECRET_LENGTH: usize = 64;

pub fn credential_prefix(credential_id: Uuid) -> String {
    format!("{TOKEN_PREFIX}{credential_id}_")
}

pub(in crate::modules::cache) fn credential_id(token: &str) -> Option<Uuid> {
    let body = token.strip_prefix(TOKEN_PREFIX)?;
    let (id, secret) = body.split_once('_')?;

    if secret.len() != TOKEN_SECRET_LENGTH
        || secret.bytes().all(|byte| byte.is_ascii_hexdigit()) == false
    {
        return None;
    }

    Uuid::parse_str(id).ok()
}

pub(in crate::modules::cache) fn token_matches(
    token: &str,
    hash: Vec<u8>,
) -> Result<bool, ApiError> {
    let expected = <[u8; 32]>::try_from(hash)
        .map_err(|_| ApiError::internal("invalid stored cache credential hash length"))?;
    let presented = CtOutput::<Sha256>::new(hash_opaque_token(token).into());
    let expected = CtOutput::<Sha256>::new(expected.into());

    Ok(presented == expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::opaque_token::OpaqueToken;

    #[test]
    fn recognizes_only_cache_credentials() {
        let id = Uuid::new_v4();
        let credential = OpaqueToken::generate(&credential_prefix(id));

        assert_eq!(credential_id(&credential.plaintext), Some(id));
        assert_eq!(credential_id("nc_sk_secret"), None);
        assert_eq!(credential_id(&credential_prefix(id)), None);
        assert_eq!(
            credential_id(&format!("{TOKEN_PREFIX}bad_{}", "a".repeat(64))),
            None
        );
        assert_eq!(
            credential_id(&format!("{}{}", credential_prefix(id), "z".repeat(64))),
            None
        );
    }

    #[test]
    fn verifies_the_stored_hash() -> Result<(), ApiError> {
        let token = OpaqueToken::generate(&credential_prefix(Uuid::new_v4()));
        assert!(token_matches(&token.plaintext, token.hash.to_vec())?);
        assert!(token_matches("wrong secret", token.hash.to_vec())? == false);
        assert!(token_matches(&token.plaintext, Vec::new()).is_err());
        Ok(())
    }
}
