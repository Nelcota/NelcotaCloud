/// Bytes from the thread-local CSPRNG, which is seeded from the operating system.
pub fn random_bytes<const LENGTH: usize>() -> [u8; LENGTH] {
    rand::random()
}

/// A random password for tests: fixed strings in code read as hard-coded credentials.
#[cfg(test)]
pub fn random_test_password() -> String {
    crate::shared::crypto::hex_encoding::encode_hex(&random_bytes::<16>())
}
