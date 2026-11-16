use crate::modules::auth::password::password_hashing::{PasswordHashingError, verify_password};
use crate::modules::auth::user::user_record::{User, UserCredentials};

#[derive(Debug, thiserror::Error)]
pub enum PasswordAuthenticationError {
    #[error("invalid email or password")]
    InvalidCredentials,
    #[error(transparent)]
    Hashing(#[from] PasswordHashingError),
}

/// A user whose password matched, with the hash it matched against.
pub struct VerifiedCredentials {
    pub user: User,
    /// Lets the session be created only while this is still the user's password.
    pub password_hash: String,
}

/// Checks an email's password in constant work.
///
/// Always runs one Argon2 verification, even for unknown emails or passwordless (OAuth) users,
/// so response time does not reveal which accounts exist. `dummy_password_hash` is the hash of
/// a random password nobody knows.
pub async fn authenticate_with_password(
    credentials: Option<UserCredentials>,
    password: String,
    dummy_password_hash: &str,
) -> Result<VerifiedCredentials, PasswordAuthenticationError> {
    let (user, stored_hash) = match credentials {
        Some(credentials) => (Some(credentials.user), credentials.password_hash),
        None => (None, None),
    };
    // Verification runs on the blocking pool and takes its own copy; the original is returned.
    let hash_to_check = stored_hash
        .clone()
        .unwrap_or_else(|| dummy_password_hash.to_owned());

    if verify_password(password, hash_to_check).await? == false {
        return Err(PasswordAuthenticationError::InvalidCredentials);
    }

    let (Some(user), Some(password_hash)) = (user, stored_hash) else {
        return Err(PasswordAuthenticationError::InvalidCredentials);
    };

    Ok(VerifiedCredentials {
        user,
        password_hash,
    })
}
