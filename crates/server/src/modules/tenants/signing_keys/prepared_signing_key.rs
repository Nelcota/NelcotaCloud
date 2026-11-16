use jsonwebtoken::jwk::{Jwk, PublicKeyUse};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey};
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key::{SigningKey, SigningKeyError};

/// A signing key with everything derived once, when it enters the cache. Deriving the public
/// key goes through a JWK (base64 encode and decode), far too much work to redo per request.
pub struct PreparedSigningKey {
    pub key_id: Uuid,
    pub encoding_key: EncodingKey,
    pub decoding_key: DecodingKey,
    pub public_jwk: Jwk,
}

impl PreparedSigningKey {
    pub fn prepare(signing_key: SigningKey) -> Result<Self, SigningKeyError> {
        let encoding_key = EncodingKey::from_ed_der(&signing_key.private_key_der);
        let mut public_jwk = Jwk::from_encoding_key(&encoding_key, Algorithm::EdDSA)?;
        public_jwk.common.key_id = Some(signing_key.key_id.to_string());
        public_jwk.common.public_key_use = Some(PublicKeyUse::Signature);
        let decoding_key = DecodingKey::from_jwk(&public_jwk)?;

        Ok(Self {
            key_id: signing_key.key_id,
            encoding_key,
            decoding_key,
            public_jwk,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publishes_the_key_id_without_private_material() -> Result<(), Box<dyn std::error::Error>> {
        let signing_key = SigningKey::generate()?;
        let key_id = signing_key.key_id;
        let prepared = PreparedSigningKey::prepare(signing_key)?;
        let public_jwk = serde_json::to_value(&prepared.public_jwk)?;

        assert_eq!(prepared.public_jwk.common.key_id, Some(key_id.to_string()));
        assert!(public_jwk.get("d").is_none());
        Ok(())
    }
}
