use crate::shared::database::sql_identifier::quote_identifier;

/// Postgres truncates identifiers longer than this.
const MAX_NAME_BYTES: usize = 63;

/// A name for a table, column or policy created from the console: lowercase letters, digits and
/// underscores, starting with a letter or underscore, so it never needs quoting in the
/// project's own SQL.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ObjectName(String);

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error(
    "invalid name {0}: use lowercase letters, digits and _ (at most 63), starting with a letter"
)]
pub struct InvalidObjectName(pub String);

impl ObjectName {
    pub fn parse(text: &str) -> Result<Self, InvalidObjectName> {
        let name = text.trim();
        let invalid = || InvalidObjectName(name.to_owned());
        let first = name.chars().next().ok_or_else(invalid)?;

        if name.len() > MAX_NAME_BYTES || (first.is_ascii_lowercase() || first == '_') == false {
            return Err(invalid());
        }

        let is_allowed = |character: char| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '_'
        };

        if name.chars().all(is_allowed) == false {
            return Err(invalid());
        }

        Ok(Self(name.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// `"name"`.
    pub fn quoted(&self) -> String {
        quote_identifier(&self.0)
    }

    /// `public."name"`.
    pub fn in_public(&self) -> String {
        format!("public.{}", self.quoted())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_snake_case_names() -> Result<(), InvalidObjectName> {
        assert_eq!(
            ObjectName::parse(" user_profiles2 ")?.as_str(),
            "user_profiles2"
        );
        assert_eq!(
            ObjectName::parse("_draft")?.in_public(),
            "public.\"_draft\""
        );
        Ok(())
    }

    #[test]
    fn refuses_anything_that_would_need_quoting() {
        let too_long = "a".repeat(64);

        for name in [
            "",
            "1st",
            "Users",
            "a-b",
            "a b",
            "a\"b",
            "ação",
            too_long.as_str(),
        ] {
            assert!(ObjectName::parse(name).is_err(), "{name} should be refused");
        }
    }
}
