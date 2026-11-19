const MIN_SLUG_LENGTH: usize = 3;
const MAX_SLUG_LENGTH: usize = 40;
const DATABASE_NAME_PREFIX: &str = "tenant_";

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error(
    "slug must be 3-40 characters of lowercase letters, digits or underscores, starting with a letter"
)]
pub struct InvalidTenantSlug;

/// A slug is safe to embed in a quoted SQL identifier because it only allows `[a-z0-9_]`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantSlug(String);

impl TenantSlug {
    pub fn parse(raw: &str) -> Result<Self, InvalidTenantSlug> {
        let slug = raw.trim();
        if (MIN_SLUG_LENGTH..=MAX_SLUG_LENGTH).contains(&slug.len()) == false {
            return Err(InvalidTenantSlug);
        }

        let first_character = slug.chars().next().ok_or(InvalidTenantSlug)?;

        if first_character.is_ascii_lowercase() == false {
            return Err(InvalidTenantSlug);
        }

        if slug.chars().all(is_slug_character) == false {
            return Err(InvalidTenantSlug);
        }

        Ok(Self(slug.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn database_name(&self) -> String {
        format!("{DATABASE_NAME_PREFIX}{}", self.0)
    }
}

fn is_slug_character(character: char) -> bool {
    character.is_ascii_lowercase() || character.is_ascii_digit() || character == '_'
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_slug() -> Result<(), InvalidTenantSlug> {
        let slug = TenantSlug::parse(" acme_2 ")?;

        assert_eq!(slug.as_str(), "acme_2");
        assert_eq!(slug.database_name(), "tenant_acme_2");
        Ok(())
    }

    #[test]
    fn rejects_invalid_slugs() {
        let invalid_slugs = [
            "",
            "ab",
            "1acme",
            "Acme",
            "acme-corp",
            "acme\"; drop",
            "a".repeat(41).as_str(),
        ]
        .map(TenantSlug::parse);

        for result in invalid_slugs {
            assert_eq!(result, Err(InvalidTenantSlug));
        }
    }
}
