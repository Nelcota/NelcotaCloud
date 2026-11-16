#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OAuthProvider {
    Google,
    GitHub,
}

impl OAuthProvider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Google => "google",
            Self::GitHub => "github",
        }
    }

    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "google" => Some(Self::Google),
            "github" => Some(Self::GitHub),
            _ => None,
        }
    }

    /// The minimum needed to read a stable user id and a verified email.
    pub fn scopes(self) -> &'static [&'static str] {
        match self {
            Self::Google => &["openid", "email"],
            Self::GitHub => &["read:user", "user:email"],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_text() {
        for provider in [OAuthProvider::Google, OAuthProvider::GitHub] {
            assert_eq!(OAuthProvider::parse(provider.as_str()), Some(provider));
        }

        assert_eq!(OAuthProvider::parse("GitHub"), None);
    }
}
