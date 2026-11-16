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

    #[test]
    fn rejects_whitespace_only_passwords() {
        assert_eq!(check_new_password("        "), Err(BlankPassword));
        assert_eq!(check_new_password("\t\n  \t\n"), Err(BlankPassword));
    }

    #[test]
    fn accepts_passwords_with_inner_spaces() {
        assert_eq!(check_new_password("correct horse battery"), Ok(()));
    }
}
