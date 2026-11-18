use validator::ValidationError;

/// Text shown on one line (names that end up in email subjects): no line breaks, tabs or other
/// control characters, so it can never start a new header.
pub fn check_single_line(text: &str) -> Result<(), ValidationError> {
    if text.chars().any(char::is_control) {
        let message = "must be a single line without control characters";
        return Err(ValidationError::new("control_characters").with_message(message.into()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plain_text_and_refuses_control_characters() {
        assert!(check_single_line("Loja Aurora — Pagamentos").is_ok());

        for text in ["a\r\nBcc: x@y.z", "a\nb", "a\tb", "a\u{0}"] {
            assert!(check_single_line(text).is_err(), "{text:?}");
        }
    }
}
