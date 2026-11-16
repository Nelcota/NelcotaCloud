use argon2::password_hash::Error as PasswordHashError;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use tokio::task::JoinError;

#[derive(Debug, thiserror::Error)]
pub enum PasswordHashingError {
    #[error("password hashing failed: {0}")]
    Hashing(#[from] PasswordHashError),
    #[error("password hashing task failed: {0}")]
    Task(#[from] JoinError),
}

/// Argon2id with the crate defaults. Runs on the blocking pool: hashing is CPU and memory heavy.
pub async fn hash_password(password: String) -> Result<String, PasswordHashingError> {
    tokio::task::spawn_blocking(move || hash_password_blocking(&password)).await?
}

pub async fn verify_password(
    password: String,
    stored_hash: String,
) -> Result<bool, PasswordHashingError> {
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

    #[tokio::test]
    async fn verifies_matching_password_only() -> Result<(), PasswordHashingError> {
        let stored_hash = hash_password("correct horse".to_owned()).await?;

        assert!(verify_password("correct horse".to_owned(), stored_hash.clone()).await?);
        assert!(verify_password("wrong horse".to_owned(), stored_hash).await? == false);
        Ok(())
    }

    #[tokio::test]
    async fn rejects_malformed_hash() {
        let verification = verify_password("anything".to_owned(), "not-a-hash".to_owned()).await;

        assert!(verification.is_err());
    }
}
