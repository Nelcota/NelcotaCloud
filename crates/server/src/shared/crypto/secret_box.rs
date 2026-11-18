use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};

use crate::shared::crypto::random_bytes::random_bytes;

const NONCE_LENGTH: usize = 12;

#[derive(Debug, thiserror::Error)]
pub enum SecretBoxError {
    #[error("master key must be 32 bytes")]
    InvalidKeyLength,
    #[error("failed to encrypt secret")]
    EncryptionFailed,
    #[error(
        "failed to decrypt secret: corrupted, moved to another record, or the master key changed"
    )]
    DecryptionFailed,
}

/// Encrypts tenant secrets at rest with AES-256-GCM. Output layout: nonce || ciphertext+tag.
///
/// Every secret is bound to a `context` (associated data) naming where it belongs, e.g. the
/// tenant and column. A ciphertext copied into another record then fails to open.
pub struct SecretBox {
    cipher: Aes256Gcm,
}

impl SecretBox {
    pub fn new(master_key: &[u8]) -> Result<Self, SecretBoxError> {
        let cipher =
            Aes256Gcm::new_from_slice(master_key).map_err(|_| SecretBoxError::InvalidKeyLength)?;

        Ok(Self { cipher })
    }

    pub fn seal(&self, plaintext: &[u8], context: &str) -> Result<Vec<u8>, SecretBoxError> {
        let nonce_bytes = random_bytes::<NONCE_LENGTH>();
        let nonce = Nonce::from(nonce_bytes);
        let payload = Payload {
            msg: plaintext,
            aad: context.as_bytes(),
        };
        let ciphertext = self
            .cipher
            .encrypt(&nonce, payload)
            .map_err(|_| SecretBoxError::EncryptionFailed)?;
        let mut sealed = Vec::with_capacity(NONCE_LENGTH.saturating_add(ciphertext.len()));
        sealed.extend_from_slice(&nonce_bytes);
        sealed.extend_from_slice(&ciphertext);

        Ok(sealed)
    }

    pub fn open(&self, sealed: &[u8], context: &str) -> Result<Vec<u8>, SecretBoxError> {
        let Some((nonce_bytes, ciphertext)) = sealed.split_at_checked(NONCE_LENGTH) else {
            return Err(SecretBoxError::DecryptionFailed);
        };
        let nonce = Nonce::try_from(nonce_bytes).map_err(|_| SecretBoxError::DecryptionFailed)?;
        let payload = Payload {
            msg: ciphertext,
            aad: context.as_bytes(),
        };

        self.cipher
            .decrypt(&nonce, payload)
            .map_err(|_| SecretBoxError::DecryptionFailed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::random_bytes::random_bytes;

    const CONTEXT: &str = "signing_key:tenant-a";

    #[test]
    fn round_trips_plaintext() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&random_bytes::<32>())?;
        let sealed = secret_box.seal(b"secret", CONTEXT)?;

        assert_eq!(secret_box.open(&sealed, CONTEXT)?, b"secret");
        Ok(())
    }

    #[test]
    fn rejects_a_ciphertext_moved_to_another_context() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&random_bytes::<32>())?;
        let sealed = secret_box.seal(b"secret", CONTEXT)?;

        assert!(secret_box.open(&sealed, "signing_key:tenant-b").is_err());
        Ok(())
    }

    #[test]
    fn rejects_tampered_ciphertext() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&random_bytes::<32>())?;
        let mut sealed = secret_box.seal(b"secret", CONTEXT)?;
        let Some(last_byte) = sealed.last_mut() else {
            return Err(SecretBoxError::EncryptionFailed);
        };
        *last_byte ^= 0x01;

        assert!(secret_box.open(&sealed, CONTEXT).is_err());
        Ok(())
    }

    #[test]
    fn rejects_short_input() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&random_bytes::<32>())?;

        assert!(secret_box.open(&[1, 2, 3], CONTEXT).is_err());
        Ok(())
    }

    #[test]
    fn rejects_wrong_key_length() {
        assert!(SecretBox::new(&random_bytes::<16>()).is_err());
    }
}
