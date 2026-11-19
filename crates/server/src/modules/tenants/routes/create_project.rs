use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::provisioning::tenant_provisioner::ProjectOwner;
use crate::modules::tenants::routes::tenant_creation_body::{
    CreateTenantBody, CreatedTenantResponse, provision_tenant,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
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
        (status = 429, description = "Too many projects created from this client", body = ErrorBody),
    )
)]
pub async fn create_project(
    State(state): State<AppState>,
    account: PlatformAccount,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<CreateTenantBody>,
) -> Result<(StatusCode, Json<CreatedTenantResponse>), ApiError> {
    // Keyed by IP alone, so new accounts from the same client share the limit.
    state
        .rate_limits
        .project_creation_per_client_ip
        .check(Uuid::nil(), client_ip)?;
    state
        .rate_limits
        .project_creation_per_account
        .check(Uuid::nil(), account.account_id)?;
    let owner = ProjectOwner {
        account_id: account.account_id,
        email: account.email.clone(),
    };
    let request = body.into_request(Some(owner))?;
    let created = provision_tenant(&state, request).await?;

    Ok((StatusCode::CREATED, Json(created)))
}
