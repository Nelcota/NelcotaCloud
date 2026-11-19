use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::team::member::owner_actions::{OwnerAction, change_member_role};
use crate::modules::team::member::ownership_changes::MembershipTarget;
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct MemberRoleBody {
    pub role: ProjectRole,
}

/// `PATCH /platform/v1/projects/{project_id}/members/{account_id}`: makes a member an owner,
/// or an owner a member. Owners only; the project always keeps at least one owner.
#[utoipa::path(
    patch,
    path = "/platform/v1/projects/{project_id}/members/{account_id}",
    tag = "platform",
    security(("platform_account" = [])),
    params(
        ("project_id" = Uuid, Path, description = "Id of the project"),
        ("account_id" = Uuid, Path, description = "Console account of the member"),
    ),
    request_body = MemberRoleBody,
    responses(
        (status = 204, description = "Role changed"),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 404, description = "No such member", body = ErrorBody),
        (status = 409, description = "The last owner, or the account owns too many projects", body = ErrorBody),
    )
)]
pub async fn change_role(
    State(state): State<AppState>,
    account: PlatformAccount,
    origin: RequestOrigin,
    Path((project_id, member_id)): Path<(Uuid, Uuid)>,
    ValidatedJson(body): ValidatedJson<MemberRoleBody>,
) -> Result<StatusCode, ApiError> {
    require_owner(&state.control_plane_pool, project_id, &account).await?;
    let target = MembershipTarget {
        tenant_id: project_id,
        account_id: member_id,
    };
    let action = OwnerAction {
        actor_account_id: account.account_id,
        target,
    };
    change_member_role(&state.control_plane_pool, action, body.role).await?;
    let change = ProjectChange {
        tenant_id: project_id,
        author: (AdminActor::ConsoleAccount(account.account_id), &origin),
        action: AuditAction::MemberRoleChanged,
        details: json!({ "account_id": member_id, "role": body.role }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}
