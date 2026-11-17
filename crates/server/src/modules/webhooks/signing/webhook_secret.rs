use base64::Engine;
use base64::engine::general_purpose::STANDARD;

use crate::shared::crypto::random_bytes::random_bytes;

/// 192 bits, like the secrets of other Standard Webhooks senders.
const SECRET_BYTES: usize = 24;
const SECRET_PREFIX: &str = "whsec_";

/// The key both sides use to sign and check webhook requests. Kept encrypted at rest; shown to
/// the owner once, as `whsec_<base64>`, which Standard Webhooks libraries accept as is.
pub struct WebhookSecret {
    key: Vec<u8>,
}

impl WebhookSecret {
    pub fn generate() -> Self {
        Self {
            key: random_bytes::<SECRET_BYTES>().to_vec(),
        }
    }

    pub fn from_key(key: Vec<u8>) -> Self {
        Self { key }
    }

    pub fn key(&self) -> &[u8] {
        &self.key
    }

    pub fn encode(&self) -> String {
        format!("{SECRET_PREFIX}{}", STANDARD.encode(&self.key))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_with_the_standard_prefix() -> Result<(), base64::DecodeError> {
        let secret = WebhookSecret::generate();
        let encoded = secret.encode();
        let Some(base64_key) = encoded.strip_prefix(SECRET_PREFIX) else {
            return Err(base64::DecodeError::InvalidLength(0));
        };

        assert_eq!(STANDARD.decode(base64_key)?, secret.key());
        Ok(())
    }

    #[test]
    fn every_secret_is_new() {
        assert_ne!(
            WebhookSecret::generate().key(),
            WebhookSecret::generate().key()
        );
    }
}
