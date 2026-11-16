/// Publishable keys ship inside client apps; secret keys stay on the tenant's own servers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiKeyKind {
    Publishable,
    Secret,
}

impl ApiKeyKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Publishable => "publishable",
            Self::Secret => "secret",
        }
    }

    pub fn token_prefix(self) -> &'static str {
        match self {
            Self::Publishable => "nc_pk_",
            Self::Secret => "nc_sk_",
        }
    }

    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "publishable" => Some(Self::Publishable),
            "secret" => Some(Self::Secret),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_text() {
        for kind in [ApiKeyKind::Publishable, ApiKeyKind::Secret] {
            assert_eq!(ApiKeyKind::parse(kind.as_str()), Some(kind));
        }

        assert_eq!(ApiKeyKind::parse("admin"), None);
    }
}
