/// Bytes from the thread-local CSPRNG, which is seeded from the operating system.
pub fn random_bytes<const LENGTH: usize>() -> [u8; LENGTH] {
    let mut bytes = [0u8; LENGTH];
    rand::fill(&mut bytes);

    bytes
}
