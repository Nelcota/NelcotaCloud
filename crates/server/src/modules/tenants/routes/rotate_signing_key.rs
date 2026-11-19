use axum::Json;
use axum::extract::State;
use serde::Serialize;
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::modules::tenants::signing_keys::signing_key_repository::SigningKeyStoreError;
use crate::modules::tenants::signing_keys::signing_key_rotation::rotate_signing_key as rotate;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct RotatedSigningKey {
    /// The `kid` of the key that now signs access tokens.
    pub key_id: Uuid,
}

/// `POST /admin/signing-keys/rotate`: a new key signs from now on; tokens signed by the
/// previous key keep verifying until they expire.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/signing-keys/rotate",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Key rotated", body = RotatedSigningKey),
        (status = 409, description = "Too many rotations within a day", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn rotate_signing_key(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<RotatedSigningKey>, ApiError> {
    let tenant_id = admin.tenant_id;
    let key_id = rotate(&state.control_plane_pool, tenant_id, &state.secret_box)
        .await
        .map_err(|error| match error {
            SigningKeyStoreError::TooManyRotations(_) => ApiError::Conflict(error.to_string()),
            other => ApiError::internal(other),
        })?;
    state.signing_keys.forget(tenant_id);
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "signing_key", "key_id": key_id }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(Json(RotatedSigningKey { key_id }))
}
