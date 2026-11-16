use ed25519_dalek::pkcs8::{EncodePrivateKey, KeypairBytes};
use jsonwebtoken::jwk::{Jwk, PublicKeyUse};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey};
use uuid::Uuid;

use crate::shared::crypto::random_bytes::random_bytes;

const ED25519_SEED_LENGTH: usize = 32;

#[derive(Debug, thiserror::Error)]
pub enum SigningKeyError {
    #[error("failed to encode Ed25519 private key: {0}")]
    Encoding(#[from] ed25519_dalek::pkcs8::Error),
    #[error("failed to derive JWK from signing key: {0}")]
    Jwk(#[from] jsonwebtoken::errors::Error),
}

/// One tenant's Ed25519 key. `key_id` is published as the JWT `kid` so verifiers pick the right key.
#[derive(Clone)]
pub struct SigningKey {
    pub key_id: Uuid,
    pub private_key_der: Vec<u8>,
}

impl SigningKey {
    pub fn generate() -> Result<Self, SigningKeyError> {
        // Any 32 random bytes are a valid Ed25519 seed.
        let seed = random_bytes::<ED25519_SEED_LENGTH>();
        // PKCS#8 v1 (without the embedded public key) is the only form jsonwebtoken turns into a JWK.
        let keypair = KeypairBytes {
            secret_key: seed,
            public_key: None,
        };
        let document = keypair.to_pkcs8_der()?;

        Ok(Self {
            key_id: Uuid::new_v4(),
            private_key_der: document.as_bytes().to_vec(),
        })
    }

    pub fn encoding_key(&self) -> EncodingKey {
        EncodingKey::from_ed_der(&self.private_key_der)
    }

    pub fn public_jwk(&self) -> Result<Jwk, SigningKeyError> {
        let mut jwk = Jwk::from_encoding_key(&self.encoding_key(), Algorithm::EdDSA)?;
        jwk.common.key_id = Some(self.key_id.to_string());
        jwk.common.public_key_use = Some(PublicKeyUse::Signature);

        Ok(jwk)
    }

    pub fn decoding_key(&self) -> Result<DecodingKey, SigningKeyError> {
        let jwk = self.public_jwk()?;

        Ok(DecodingKey::from_jwk(&jwk)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publishes_public_jwk_with_key_id() -> Result<(), SigningKeyError> {
        let signing_key = SigningKey::generate()?;
        let jwk = signing_key.public_jwk()?;

        assert_eq!(jwk.common.key_id, Some(signing_key.key_id.to_string()));
        Ok(())
    }
}
