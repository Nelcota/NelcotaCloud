use argon2::password_hash::Error as PasswordHashError;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use std::sync::LazyLock;
use std::thread::available_parallelism;

use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinError;

/// Argon2 runs at once per CPU core. Each run takes about 19 MiB: without a bound, a burst of
/// logins and signups (across many tenants) could take the server's memory; the rest wait.
const ARGON2_RUNS_PER_CORE: usize = 2;
const FALLBACK_CORES: usize = 2;

static ARGON2_SLOTS: LazyLock<Semaphore> = LazyLock::new(|| {
    let cores = available_parallelism().map_or(FALLBACK_CORES, std::num::NonZeroUsize::get);

    Semaphore::new(cores.saturating_mul(ARGON2_RUNS_PER_CORE))
});

#[derive(Debug, thiserror::Error)]
pub enum PasswordHashingError {
    #[error("password hashing failed: {0}")]
    Hashing(#[from] PasswordHashError),
    #[error("password hashing task failed: {0}")]
    Task(#[from] JoinError),
    #[error("password hashing is unavailable: {0}")]
    Unavailable(#[from] AcquireError),
}

/// Argon2id with the crate defaults. Runs on the blocking pool: hashing is CPU and memory heavy.
pub async fn hash_password(password: String) -> Result<String, PasswordHashingError> {
    let _slot = ARGON2_SLOTS.acquire().await?;

    tokio::task::spawn_blocking(move || hash_password_blocking(&password)).await?
}

pub async fn verify_password(
    password: String,
    stored_hash: String,
) -> Result<bool, PasswordHashingError> {
    let _slot = ARGON2_SLOTS.acquire().await?;

    tokio::task::spawn_blocking(move || verify_password_blocking(&password, &stored_hash)).await?
}

fn hash_password_blocking(password: &str) -> Result<String, PasswordHashingError> {
    let password_hash: PasswordHash = Argon2::default().hash_password(password.as_bytes())?;

    Ok(password_hash.to_string())
}

fn verify_password_blocking(
    password: &str,
    stored_hash: &str,
) -> Result<bool, PasswordHashingError> {
    let verification = Argon2::default().verify_password(password.as_bytes(), stored_hash);

    match verification {
        Ok(()) => Ok(true),
        Err(PasswordHashError::PasswordInvalid) => Ok(false),
        Err(error) => Err(PasswordHashingError::Hashing(error)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::random_bytes::random_test_password;

    #[tokio::test]
    async fn verifies_matching_password_only() -> Result<(), PasswordHashingError> {
        let password = random_test_password();
        let stored_hash = hash_password(password.clone()).await?;

        assert!(verify_password(password, stored_hash.clone()).await?);
        assert!(verify_password(random_test_password(), stored_hash).await? == false);
        Ok(())
    }

    #[tokio::test]
    async fn rejects_malformed_hash() {
        let verification = verify_password(random_test_password(), "not-a-hash".to_owned()).await;

        assert!(verification.is_err());
    }
}
