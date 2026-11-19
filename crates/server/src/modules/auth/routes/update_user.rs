use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::app_state::AppState;
use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_metadata::{
    MetadataObject, check_app_metadata_size, check_user_metadata_size,
};
use crate::modules::auth::user::user_metadata_update::{MetadataChange, update_user_metadata};
use crate::modules::auth::user::user_response::UserResponse;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
#[serde(deny_unknown_fields)]
#[validate(schema(function = "require_a_document"))]
pub struct UpdateUserBody {
    /// Replaces the user's profile data (up to 16 KiB as JSON); left as it is when absent.
    #[validate(custom(function = check_user_metadata_size))]
    #[schema(value_type = Option<std::collections::HashMap<String, serde_json::Value>>)]
    pub user_metadata: Option<MetadataObject>,
    /// Replaces the admin-only data (up to 4 KiB as JSON), sent in access tokens from the next
    /// login or refresh; left as it is when absent.
    #[validate(custom(function = check_app_metadata_size))]
    #[schema(value_type = Option<std::collections::HashMap<String, serde_json::Value>>)]
    pub app_metadata: Option<MetadataObject>,
}

fn require_a_document(body: &UpdateUserBody) -> Result<(), ValidationError> {
    if body.user_metadata.is_none() && body.app_metadata.is_none() {
        return Err(ValidationError::new("nothing_to_update")
            .with_message("send user_metadata, app_metadata or both".into()));
    }

    Ok(())
}

/// `PATCH /admin/users/{user_id}`: an admin replaces a user's metadata.
#[utoipa::path(
    patch,
    path = "/auth/v1/admin/users/{user_id}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    request_body = UpdateUserBody,
    responses(
        (status = 200, description = "The updated user", body = UserResponse),
        (status = 400, description = "Nothing to update, not a JSON object, or too large", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn update_user(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<UpdateUserBody>,
) -> Result<Json<UserResponse>, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let change = MetadataChange {
        user_id,
        user_metadata: body.user_metadata,
        app_metadata: body.app_metadata,
    };
    let updated = update_user_metadata(&admin.pool, change, &webhooks)
        .await
        .map_err(ApiError::internal)?;
    let user = match updated {
        None => return Err(ApiError::NotFound("user")),
        Some(StatusChange::Unchanged(user)) => return Ok(Json(user.into())),
        Some(StatusChange::Changed(user)) => user,
    };

    let event = NewAuditEvent::by_admin(AuditAction::UserUpdated, user_id, admin.author());
    record_audit_event(&admin.pool, event).await;

    Ok(Json(user.into()))
}
