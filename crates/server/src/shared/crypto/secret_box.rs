use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};

use crate::shared::crypto::random_bytes::random_bytes;

const NONCE_LENGTH: usize = 12;

#[derive(Debug, thiserror::Error)]
pub enum SecretBoxError {
    #[error("master key must be 32 bytes")]
    InvalidKeyLength,
    #[error("failed to encrypt secret")]
    EncryptionFailed,
    #[error("failed to decrypt secret: ciphertext is corrupted or the master key changed")]
    DecryptionFailed,
}

/// Encrypts tenant secrets at rest with AES-256-GCM. Output layout: nonce || ciphertext+tag.
pub struct SecretBox {
    cipher: Aes256Gcm,
}

impl SecretBox {
    pub fn new(master_key: &[u8]) -> Result<Self, SecretBoxError> {
        let cipher =
            Aes256Gcm::new_from_slice(master_key).map_err(|_| SecretBoxError::InvalidKeyLength)?;

        Ok(Self { cipher })
    }

    pub fn seal(&self, plaintext: &[u8]) -> Result<Vec<u8>, SecretBoxError> {
        let nonce_bytes = random_bytes::<NONCE_LENGTH>();
        let nonce = Nonce::from(nonce_bytes);
        let ciphertext = self
            .cipher
            .encrypt(&nonce, plaintext)
            .map_err(|_| SecretBoxError::EncryptionFailed)?;
        let mut sealed = nonce_bytes.to_vec();
        sealed.extend_from_slice(&ciphertext);

        Ok(sealed)
    }

    pub fn open(&self, sealed: &[u8]) -> Result<Vec<u8>, SecretBoxError> {
        let Some((nonce_bytes, ciphertext)) = sealed.split_at_checked(NONCE_LENGTH) else {
            return Err(SecretBoxError::DecryptionFailed);
        };
        let nonce = Nonce::try_from(nonce_bytes).map_err(|_| SecretBoxError::DecryptionFailed)?;

        self.cipher
            .decrypt(&nonce, ciphertext)
            .map_err(|_| SecretBoxError::DecryptionFailed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_KEY: [u8; 32] = [7u8; 32];

    #[test]
    fn round_trips_plaintext() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&TEST_KEY)?;
        let sealed = secret_box.seal(b"postgres://secret")?;

        assert_eq!(secret_box.open(&sealed)?, b"postgres://secret");
        Ok(())
    }

    #[test]
    fn rejects_tampered_ciphertext() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&TEST_KEY)?;
        let mut sealed = secret_box.seal(b"secret")?;
        let Some(last_byte) = sealed.last_mut() else {
            return Err(SecretBoxError::EncryptionFailed);
        };
        *last_byte ^= 0x01;

        assert!(secret_box.open(&sealed).is_err());
        Ok(())
    }

    #[test]
    fn rejects_short_input() -> Result<(), SecretBoxError> {
        let secret_box = SecretBox::new(&TEST_KEY)?;

        assert!(secret_box.open(&[1, 2, 3]).is_err());
        Ok(())
    }

    #[test]
    fn rejects_wrong_key_length() {
        assert!(SecretBox::new(&[1u8; 16]).is_err());
    }
}
