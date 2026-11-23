use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// What a platform account may do in a project: owners can also delete it and manage the
/// team; viewers only read (`TenantAdmin` refuses their changes).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ProjectRole {
    Owner,
    Member,
    Viewer,
}

impl ProjectRole {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Member => "member",
            Self::Viewer => "viewer",
        }
    }

    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "owner" => Some(Self::Owner),
            "member" => Some(Self::Member),
            "viewer" => Some(Self::Viewer),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_text() {
        for role in [ProjectRole::Owner, ProjectRole::Member, ProjectRole::Viewer] {
            assert_eq!(ProjectRole::parse(role.as_str()), Some(role));
        }

        assert_eq!(ProjectRole::parse("admin"), None);
    }
}
