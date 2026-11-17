use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of team changes: invitations, roles and ownership.
#[derive(Debug, thiserror::Error)]
pub enum TeamRejection {
    #[error("a project needs at least one owner: make someone else an owner first")]
    LastOwner,
    #[error("this email is already a member of the project")]
    AlreadyMember,
    #[error("this email already has a pending invitation")]
    AlreadyInvited,
    #[error("this account already owns {0} projects, the most allowed")]
    OwnedProjectLimit(i64),
}

impl TeamRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::LastOwner => (StatusCode::CONFLICT, "last_owner"),
            Self::AlreadyMember => (StatusCode::CONFLICT, "already_member"),
            Self::AlreadyInvited => (StatusCode::CONFLICT, "already_invited"),
            Self::OwnedProjectLimit(_) => (StatusCode::CONFLICT, "owned_project_limit"),
        }
    }
}

impl From<TeamRejection> for ApiError {
    fn from(rejection: TeamRejection) -> Self {
        let (status, code) = rejection.status_and_code();

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    /// Clients match on these codes: changing one is a breaking change of the API.
    #[test]
    fn every_refusal_keeps_its_status_and_a_unique_code() {
        let cases = [
            (TeamRejection::LastOwner, StatusCode::CONFLICT, "last_owner"),
            (
                TeamRejection::AlreadyMember,
                StatusCode::CONFLICT,
                "already_member",
            ),
            (
                TeamRejection::AlreadyInvited,
                StatusCode::CONFLICT,
                "already_invited",
            ),
            (
                TeamRejection::OwnedProjectLimit(10),
                StatusCode::CONFLICT,
                "owned_project_limit",
            ),
        ];
        let mut seen_codes = HashSet::new();

        for (rejection, status, code) in cases {
            assert_eq!(rejection.status_and_code(), (status, code));
            assert!(seen_codes.insert(code), "duplicate code {code}");
        }
    }

    #[test]
    fn becomes_an_api_error_with_its_code_and_message() {
        let error = ApiError::from(TeamRejection::OwnedProjectLimit(10));
        let rejection = match error {
            ApiError::Rejected(rejection) => Some(rejection),
            _ => None,
        };

        assert_eq!(
            rejection.as_ref().map(|rejection| rejection.code),
            Some("owned_project_limit")
        );
        assert_eq!(
            rejection.map(|rejection| rejection.message),
            Some("this account already owns 10 projects, the most allowed".to_owned())
        );
    }
}
