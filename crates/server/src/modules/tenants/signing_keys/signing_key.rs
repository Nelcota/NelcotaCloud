use ed25519_dalek::pkcs8::{EncodePrivateKey, KeypairBytes};
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

/// One tenant's Ed25519 key as stored: its id (the JWT `kid`) and the PKCS#8 private key.
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
}
