use std::time::Duration;

use crate::modules::tenants::database::database_roles::{
    ANON_ROLE, AUTHENTICATED_ROLE, SERVICE_ROLE,
};

/// The Postgres role a Data API request runs as, from the credentials it carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestRole {
    /// Publishable key, no user.
    Anon,
    /// Publishable key and a user's access token.
    Authenticated,
    /// Secret key, or a console account managing the project: row level security is bypassed.
    Service,
}

/// Public traffic gets short statements; servers and the console may run longer ones.
const ANON_STATEMENT_TIMEOUT: Duration = Duration::from_secs(5);
const AUTHENTICATED_STATEMENT_TIMEOUT: Duration = Duration::from_secs(8);
const SERVICE_STATEMENT_TIMEOUT: Duration = Duration::from_secs(30);

impl RequestRole {
    pub fn database_role(self) -> &'static str {
        match self {
            Self::Anon => ANON_ROLE,
            Self::Authenticated => AUTHENTICATED_ROLE,
            Self::Service => SERVICE_ROLE,
        }
    }

    /// The `role` claim policies read with `auth.role()`.
    pub fn claim(self) -> &'static str {
        match self {
            Self::Anon => "anon",
            Self::Authenticated => "authenticated",
            Self::Service => "service",
        }
    }

    pub fn statement_timeout(self) -> Duration {
        match self {
            Self::Anon => ANON_STATEMENT_TIMEOUT,
            Self::Authenticated => AUTHENTICATED_STATEMENT_TIMEOUT,
            Self::Service => SERVICE_STATEMENT_TIMEOUT,
        }
    }
}
