use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_issuance::{
    ApiKeyRequest, IssuedApiKey, MAX_KEY_NAME_LENGTH, issue_api_key,
};
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_repository::ApiKeyOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, ToSchema, validator::Validate)]
pub struct CreateApiKeyBody {
    pub kind: ApiKeyKind,
    /// A label to tell the key apart ("App iOS"); optional, up to 64 characters.
    #[validate(length(max = MAX_KEY_NAME_LENGTH))]
    #[serde(default)]
    pub name: String,
}

/// `POST /admin/api-keys`: a new key next to the existing ones, so apps can switch to it
/// before the old one is revoked. The key is shown only in this response.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/api-keys",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = CreateApiKeyBody,
    responses(
        (status = 201, description = "Key created; store it now, it is not shown again", body = IssuedApiKey),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn create_api_key(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<CreateApiKeyBody>,
) -> Result<(StatusCode, Json<IssuedApiKey>), ApiError> {
    let owner = ApiKeyOwner {
        tenant_id: admin.tenant_id,
        kind: body.kind,
    };
    let mut connection = state
        .control_plane_pool
        .acquire()
        .await
        .map_err(ApiError::internal)?;
    let request = ApiKeyRequest {
        owner,
        name: &body.name,
    };
    let issued = issue_api_key(&mut connection, request)
        .await
        .map_err(ApiError::internal)?;

    Ok((StatusCode::CREATED, Json(issued)))
}
