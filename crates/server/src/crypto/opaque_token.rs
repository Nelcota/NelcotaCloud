use sha2::{Digest, Sha256};

use crate::crypto::hex_encoding::encode_hex;
use crate::crypto::random_bytes::random_bytes;

const TOKEN_ENTROPY_BYTES: usize = 32;

/// A random bearer secret. Only its hash is stored, so a database leak does not leak usable tokens.
pub struct OpaqueToken {
    pub plaintext: String,
    pub hash: Vec<u8>,
}

impl OpaqueToken {
    pub fn generate(prefix: &str) -> Self {
        let secret = encode_hex(&random_bytes::<TOKEN_ENTROPY_BYTES>());
        let plaintext = format!("{prefix}{secret}");
        let hash = hash_opaque_token(&plaintext);

        Self { plaintext, hash }
    }
}

/// A plain SHA-256 is enough here (no salt or slow hash): tokens carry 256 bits of entropy.
pub fn hash_opaque_token(plaintext: &str) -> Vec<u8> {
    Sha256::digest(plaintext.as_bytes()).to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_prefixed_unique_tokens() {
        let first = OpaqueToken::generate("nc_rt_");
        let second = OpaqueToken::generate("nc_rt_");

        assert!(first.plaintext.starts_with("nc_rt_"));
        assert_ne!(first.plaintext, second.plaintext);
        assert_eq!(first.hash, hash_opaque_token(&first.plaintext));
    }
}
