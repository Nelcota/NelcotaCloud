use crate::modules::team::rejection::team_rejection::TeamRejection;
use crate::modules::tenants::platform::membership_repository::MembershipError;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
pub enum OwnershipError {
    #[error("no such member")]
    NotMember,
    #[error("a project needs at least one owner: make someone else an owner first")]
    LastOwner,
    #[error("this account already owns {0} projects, the most allowed")]
    OwnedProjectLimit(i64),
    #[error("only an owner can hand the project over")]
    NotOwner,
    #[error("the project is already yours")]
    SameAccount,
    #[error("stored membership has an unknown role")]
    UnknownRole,
    #[error("database error while changing a membership: {0}")]
    Database(#[from] sqlx::Error),
}

impl From<MembershipError> for OwnershipError {
    fn from(error: MembershipError) -> Self {
        match error {
            MembershipError::Database(error) => Self::Database(error),
            MembershipError::UnknownRole => Self::UnknownRole,
        }
    }
}

impl From<OwnershipError> for ApiError {
    fn from(error: OwnershipError) -> Self {
        match error {
            OwnershipError::NotMember => Self::NotFound("member"),
            OwnershipError::LastOwner => Self::from(TeamRejection::LastOwner),
            OwnershipError::OwnedProjectLimit(limit) => {
                Self::from(TeamRejection::OwnedProjectLimit(limit))
            }
            OwnershipError::NotOwner => Self::from(TenantsRejection::ProjectAccessDenied),
            OwnershipError::SameAccount => Self::invalid_request(error),
            OwnershipError::UnknownRole | OwnershipError::Database(_) => Self::internal(error),
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::*;

    fn status_of(error: OwnershipError) -> StatusCode {
        ApiError::from(error).into_response().status()
    }

    #[test]
    fn each_refusal_maps_to_what_the_owner_can_fix() {
        assert_eq!(status_of(OwnershipError::NotMember), StatusCode::NOT_FOUND);
        assert_eq!(status_of(OwnershipError::LastOwner), StatusCode::CONFLICT);
        assert_eq!(
            status_of(OwnershipError::OwnedProjectLimit(10)),
            StatusCode::CONFLICT
        );
        assert_eq!(status_of(OwnershipError::NotOwner), StatusCode::FORBIDDEN);
        assert_eq!(
            status_of(OwnershipError::SameAccount),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn corrupt_memberships_are_server_errors() {
        let status = status_of(OwnershipError::UnknownRole);

        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    }
}
