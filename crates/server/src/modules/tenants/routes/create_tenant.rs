use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::access::admin_access::AdminAccess;
use crate::modules::tenants::routes::tenant_creation_body::{
    CreateTenantBody, CreatedTenantResponse, provision_tenant,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[utoipa::path(
    post,
    path = "/admin/v1/tenants",
    tag = "platform-admin",
    security(("admin_token" = [])),
    request_body = CreateTenantBody,
    responses(
        (status = 201, description = "Tenant created; its API keys are shown only here", body = CreatedTenantResponse),
        (status = 400, description = "Invalid slug, name or site URL", body = ErrorBody),
        (status = 401, description = "Missing or wrong admin token", body = ErrorBody),
        (status = 409, description = "Slug already taken", body = ErrorBody),
    )
)]
pub async fn create_tenant(
    _admin: AdminAccess,
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<CreateTenantBody>,
) -> Result<(StatusCode, Json<CreatedTenantResponse>), ApiError> {
    let request = body.into_request(None)?;
    let created = provision_tenant(&state, request).await?;

    Ok((StatusCode::CREATED, Json(created)))
}
