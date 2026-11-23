/// Long enough for "Sincronizar CRM de vendas", short enough for a table row.
pub const MAX_DESCRIPTION_CHARS: usize = 80;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum EndpointDescriptionError {
    #[error("the endpoint name has at most 80 characters")]
    TooLong,
    #[error("the endpoint name must be a single line of text")]
    ControlCharacters,
}

/// The name an owner gives an endpoint, trimmed; a blank one means no name (`None`).
pub fn parse_description(raw: &str) -> Result<Option<String>, EndpointDescriptionError> {
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    if trimmed.chars().count() > MAX_DESCRIPTION_CHARS {
        return Err(EndpointDescriptionError::TooLong);
    }

    if trimmed.chars().any(char::is_control) {
        return Err(EndpointDescriptionError::ControlCharacters);
    }

    Ok(Some(trimmed.to_owned()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_a_trimmed_name() {
        assert_eq!(
            parse_description("  Sincronizar CRM "),
            Ok(Some("Sincronizar CRM".to_owned()))
        );
    }

    #[test]
    fn a_blank_name_is_no_name() {
        assert_eq!(parse_description("   "), Ok(None));
        assert_eq!(parse_description(""), Ok(None));
    }

    #[test]
    fn refuses_long_names_by_characters_not_bytes() {
        let at_limit = "é".repeat(MAX_DESCRIPTION_CHARS);
        let over = "é".repeat(MAX_DESCRIPTION_CHARS + 1);

        assert!(parse_description(&at_limit).is_ok());
        assert_eq!(
            parse_description(&over),
            Err(EndpointDescriptionError::TooLong)
        );
    }

    #[test]
    fn refuses_line_breaks_and_control_characters() {
        assert_eq!(
            parse_description("CRM\nvendas"),
            Err(EndpointDescriptionError::ControlCharacters)
        );
        assert_eq!(
            parse_description("CRM\u{7}"),
            Err(EndpointDescriptionError::ControlCharacters)
        );
    }
}
