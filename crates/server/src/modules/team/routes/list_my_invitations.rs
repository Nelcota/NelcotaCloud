use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::team::invitation::received_invitation::{
    ReceivedInvitation, list_invitations_for,
};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /platform/v1/invitations`: invitations sent to the console account's email.
#[utoipa::path(
    get,
    path = "/platform/v1/invitations",
    tag = "platform",
    security(("platform_account" = [])),
    responses(
        (status = 200, description = "Pending invitations, newest first", body = Vec<ReceivedInvitation>),
        (status = 401, description = "Missing or invalid platform access token", body = ErrorBody),
    )
)]
pub async fn list_my_invitations(
    State(state): State<AppState>,
    account: PlatformAccount,
) -> Result<Json<Vec<ReceivedInvitation>>, ApiError> {
    let Ok(email) = EmailAddress::parse(&account.email) else {
        return Ok(Json(Vec::new()));
    };
    let invitations = list_invitations_for(&state.control_plane_pool, email.as_str())
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(invitations))
}
