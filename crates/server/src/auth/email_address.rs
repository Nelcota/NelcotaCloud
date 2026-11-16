use validator::ValidateEmail;

const MAX_EMAIL_LENGTH: usize = 254;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("invalid email address")]
pub struct InvalidEmailAddress;

/// A validated email, normalized to lowercase so lookups and the unique index agree.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn parse(raw: &str) -> Result<Self, InvalidEmailAddress> {
        let normalized = raw.trim().to_lowercase();

        if normalized.is_empty() || normalized.len() > MAX_EMAIL_LENGTH {
            return Err(InvalidEmailAddress);
        }

        if normalized.validate_email() == false {
            return Err(InvalidEmailAddress);
        }

        Ok(Self(normalized))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_case_and_whitespace() -> Result<(), InvalidEmailAddress> {
        let email = EmailAddress::parse("  Ana@Example.COM ")?;

        assert_eq!(email.as_str(), "ana@example.com");
        Ok(())
    }

    #[test]
    fn rejects_invalid_emails() {
        let too_long = format!("{}@example.com", "a".repeat(250));

        for raw in ["", "   ", "not-an-email", "a@", too_long.as_str()] {
            assert_eq!(EmailAddress::parse(raw), Err(InvalidEmailAddress));
        }
    }
}
