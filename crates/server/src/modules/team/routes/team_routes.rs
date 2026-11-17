use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::team::routes::accept_invitation;
use crate::modules::team::routes::cancel_invitation;
use crate::modules::team::routes::change_member_role;
use crate::modules::team::routes::decline_invitation;
use crate::modules::team::routes::invite_member;
use crate::modules::team::routes::leave_project;
use crate::modules::team::routes::list_my_invitations;
use crate::modules::team::routes::read_team;
use crate::modules::team::routes::remove_member;
use crate::modules::team::routes::transfer_ownership;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn team_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(read_team::read_team))
        .routes(routes!(invite_member::invite_member))
        .routes(routes!(cancel_invitation::cancel_invitation))
        .routes(routes!(
            remove_member::remove_member,
            change_member_role::change_role
        ))
        .routes(routes!(leave_project::leave))
        .routes(routes!(transfer_ownership::transfer))
        .routes(routes!(list_my_invitations::list_my_invitations))
        .routes(routes!(accept_invitation::accept_invitation))
        .routes(routes!(decline_invitation::decline_invitation))
}
