use validator::ValidationError;

/// `validator` custom check: `length(min = 1)` alone lets text made only of spaces through.
pub fn check_not_blank(text: &str) -> Result<(), ValidationError> {
    if text.trim().is_empty() {
        return Err(ValidationError::new("blank").with_message("must not be blank".into()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_only_spaces() {
        assert!(check_not_blank(" \n\t").is_err());
        assert!(check_not_blank(" a ").is_ok());
    }
}
