use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::routes::create_tenant::{
    CreateTenantBody, CreatedTenantResponse, provision_from_body,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /platform/v1/projects`: a new project (tenant) owned by the console account. Its API
/// keys are shown only in this response.
#[utoipa::path(
    post,
    path = "/platform/v1/projects",
    tag = "platform",
    security(("platform_account" = [])),
    request_body = CreateTenantBody,
    responses(
        (status = 201, description = "Project created; store its keys now", body = CreatedTenantResponse),
        (status = 400, description = "Invalid slug, name or site URL", body = ErrorBody),
        (status = 401, description = "Missing or invalid platform access token", body = ErrorBody),
        (status = 409, description = "Slug taken, or the account's project limit was reached", body = ErrorBody),
    )
)]
pub async fn create_project(
    State(state): State<AppState>,
    account: PlatformAccount,
    ValidatedJson(body): ValidatedJson<CreateTenantBody>,
) -> Result<(StatusCode, Json<CreatedTenantResponse>), ApiError> {
    let created = provision_from_body(&state, body, Some(account.account_id)).await?;

    Ok((StatusCode::CREATED, Json(created)))
}
