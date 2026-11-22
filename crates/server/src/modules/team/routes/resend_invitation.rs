use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::invitation::invitation_delivery::{claim_resend, deliver};
use crate::modules::team::invitation::invitation_repository::PendingInvitation;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;

/// Retries email delivery for the same pending invitation. Owners only.
#[utoipa::path(
    post,
    path = "/platform/v1/projects/{project_id}/invitations/{invitation_id}/resend",
    tag = "platform",
    security(("platform_account" = [])),
    params(
        ("project_id" = Uuid, Path, description = "Id of the project"),
        ("invitation_id" = Uuid, Path, description = "Id of the pending invitation"),
    ),
    responses(
        (status = 200, description = "Result of the email attempt", body = PendingInvitation),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 404, description = "No such pending invitation", body = ErrorBody),
        (status = 409, description = "Delivery already in progress", body = ErrorBody),
        (status = 429, description = "Too many invitations", body = ErrorBody),
    )
)]
pub async fn resend_invitation(
    State(state): State<AppState>,
    account: PlatformAccount,
    origin: RequestOrigin,
    Path(target): Path<(Uuid, Uuid)>,
) -> Result<Json<PendingInvitation>, ApiError> {
    let attempt_id = Uuid::new_v4();
    let invitation = claim_resend(&state, &account, target, attempt_id, origin.client_ip).await?;
    let invitation = deliver(&state, invitation, (target.0, attempt_id), &account.email).await?;

    Ok(Json(invitation))
}
