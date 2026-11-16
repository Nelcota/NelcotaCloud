use sha2::{Digest, Sha256};

use crate::shared::crypto::hex_encoding::encode_hex;
use crate::shared::crypto::random_bytes::random_bytes;

const TOKEN_ENTROPY_BYTES: usize = 32;

/// SHA-256 of a token; a fixed-size array, so hashing a token on every request needs no heap.
pub type TokenHash = [u8; 32];

/// A random bearer secret. Only its hash is stored, so a database leak does not leak usable tokens.
pub struct OpaqueToken {
    pub plaintext: String,
    pub hash: TokenHash,
}

impl OpaqueToken {
    pub fn generate(prefix: &str) -> Self {
        let secret = random_bytes::<TOKEN_ENTROPY_BYTES>();
        let mut plaintext =
            String::with_capacity(prefix.len().saturating_add(TOKEN_ENTROPY_BYTES * 2));
        plaintext.push_str(prefix);
        plaintext.push_str(&encode_hex(&secret));
        let hash = hash_opaque_token(&plaintext);

        Self { plaintext, hash }
    }
}

/// A plain SHA-256 is enough here (no salt or slow hash): tokens carry 256 bits of entropy.
pub fn hash_opaque_token(plaintext: &str) -> TokenHash {
    Sha256::digest(plaintext.as_bytes()).into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_prefixed_unique_tokens() {
        let first = OpaqueToken::generate("nc_rt_");
        let second = OpaqueToken::generate("nc_rt_");

        assert!(first.plaintext.starts_with("nc_rt_"));
        assert_eq!(first.plaintext.len(), 6 + 64);
        assert_ne!(first.plaintext, second.plaintext);
        assert_eq!(first.hash, hash_opaque_token(&first.plaintext));
    }
}
