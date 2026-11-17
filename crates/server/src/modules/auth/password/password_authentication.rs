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
    let hash_to_check = stored_hash.as_deref().unwrap_or(dummy_password_hash);

    if verify_password(password, hash_to_check.to_owned()).await? == false {
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

#[cfg(test)]
mod tests {
    use time::OffsetDateTime;
    use uuid::Uuid;

    use super::*;
    use crate::modules::auth::password::password_hashing::hash_password;
    use crate::shared::crypto::random_bytes::random_test_password;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn credentials(password_hash: Option<String>) -> UserCredentials {
        UserCredentials {
            user: User {
                id: Uuid::new_v4(),
                email: "ana@example.com".to_owned(),
                email_verified_at: None,
                banned_at: None,
                created_at: OffsetDateTime::now_utc(),
                mfa_enabled: false,
                avatar_updated_at: None,
                user_metadata: sqlx::types::Json(serde_json::Map::new()),
                app_metadata: sqlx::types::Json(serde_json::Map::new()),
            },
            password_hash,
        }
    }

    #[tokio::test]
    async fn the_right_password_returns_the_hash_it_matched() -> TestResult {
        let password = random_test_password();
        let stored = hash_password(password.clone()).await?;
        let verified = authenticate_with_password(
            Some(credentials(Some(stored.clone()))),
            password,
            &hash_password(random_test_password()).await?,
        )
        .await?;

        assert_eq!(verified.password_hash, stored);
        Ok(())
    }

    #[tokio::test]
    async fn a_wrong_password_is_refused() -> TestResult {
        let stored = hash_password(random_test_password()).await?;
        let dummy = hash_password(random_test_password()).await?;
        let wrong = random_test_password();
        let refused =
            authenticate_with_password(Some(credentials(Some(stored))), wrong, &dummy).await;

        assert!(matches!(
            refused,
            Err(PasswordAuthenticationError::InvalidCredentials)
        ));
        Ok(())
    }

    /// Guessing the dummy password must not log into an unknown email or a passwordless
    /// (OAuth or magic link) account.
    #[tokio::test]
    async fn the_dummy_password_never_logs_anyone_in() -> TestResult {
        let dummy_password = random_test_password();
        let dummy = hash_password(dummy_password.clone()).await?;
        let unknown = authenticate_with_password(None, dummy_password.clone(), &dummy).await;
        let passwordless =
            authenticate_with_password(Some(credentials(None)), dummy_password, &dummy).await;

        assert!(matches!(
            unknown,
            Err(PasswordAuthenticationError::InvalidCredentials)
        ));
        assert!(matches!(
            passwordless,
            Err(PasswordAuthenticationError::InvalidCredentials)
        ));
        Ok(())
    }
}
