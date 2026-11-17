#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("password must not be blank")]
pub struct BlankPassword;

/// Rules for a password being set. Length limits are enforced on the request body; this rejects
/// passwords made only of whitespace, which the length check alone accepts.
pub fn check_new_password(password: &str) -> Result<(), BlankPassword> {
    if password.trim().is_empty() {
        return Err(BlankPassword);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::random_bytes::random_test_password;

    #[test]
    fn rejects_whitespace_only_passwords() {
        for whitespace in [' ', '\t', '\n'] {
            let blank: String = std::iter::repeat_n(whitespace, 8).collect();
            assert_eq!(check_new_password(&blank), Err(BlankPassword));
        }
    }

    #[test]
    fn accepts_passwords_with_inner_spaces() {
        let password = format!("{} {}", random_test_password(), random_test_password());

        assert_eq!(check_new_password(&password), Ok(()));
    }
}
