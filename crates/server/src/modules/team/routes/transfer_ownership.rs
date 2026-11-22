use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::team::member::ownership_transfer::{OwnershipTransfer, transfer_ownership};
use crate::modules::team::member::team_access::TeamAccounts;
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct OwnershipTransferBody {
    /// The member who becomes an owner; the caller becomes a member.
    pub account_id: Uuid,
}

/// `POST /platform/v1/projects/{project_id}/ownership-transfer`: hands the project to another
/// member in one step. Owners only.
#[utoipa::path(
    post,
    path = "/platform/v1/projects/{project_id}/ownership-transfer",
    tag = "platform",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Id of the project")),
    request_body = OwnershipTransferBody,
    responses(
        (status = 204, description = "The member is an owner; you are a member"),
        (status = 400, description = "Transferring to yourself", body = ErrorBody),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 404, description = "No such member", body = ErrorBody),
        (status = 409, description = "The member owns too many projects", body = ErrorBody),
    )
)]
pub async fn transfer(
    State(state): State<AppState>,
    account: PlatformAccount,
    origin: RequestOrigin,
    Path(project_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<OwnershipTransferBody>,
) -> Result<StatusCode, ApiError> {
    require_owner(&state.control_plane_pool, project_id, &account).await?;
    let transfer = OwnershipTransfer {
        tenant_id: project_id,
        from_account_id: account.account_id,
        to_account_id: body.account_id,
    };
    let mut accounts = TeamAccounts::open(&state).await?;
    transfer_ownership(&state.control_plane_pool, &mut accounts, transfer).await?;
    let change = ProjectChange {
        tenant_id: project_id,
        author: (AdminActor::ConsoleAccount(account.account_id), &origin),
        action: AuditAction::OwnershipTransferred,
        details: json!({ "account_id": body.account_id }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}
