use crate::shared::http::api_error::ErrorBody;
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::admin_access::AdminAccess;
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_provisioner::{
    NewTenantRequest, TenantProvisioner,
};
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateTenantBody {
    #[validate(length(min = 3, max = 40))]
    pub slug: String,
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(min = 1, max = 2048))]
    pub site_url: String,
    /// Defaults to true: only verified emails can log in with a password.
    pub require_email_verification: Option<bool>,
}

#[derive(Serialize, ToSchema)]
pub struct CreatedTenantResponse {
    pub tenant_id: Uuid,
    pub slug: String,
    pub publishable_key: String,
    pub secret_key: String,
}

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
    let response = provision_from_body(&state, body, None).await?;

    Ok((StatusCode::CREATED, Json(response)))
}

/// Provisions a tenant from a request body; with `owner_account_id`, that platform account
/// becomes its owner in the same transaction.
pub async fn provision_from_body(
    state: &AppState,
    body: CreateTenantBody,
    owner_account_id: Option<Uuid>,
) -> Result<CreatedTenantResponse, ApiError> {
    let slug = TenantSlug::parse(&body.slug).map_err(ApiError::invalid_request)?;
    let site_url = SiteUrl::parse(&body.site_url).map_err(ApiError::invalid_request)?;
    let name = body.name.trim();

    if name.is_empty() {
        return Err(ApiError::InvalidRequest(
            "name must not be blank".to_owned(),
        ));
    }

    let settings = &state.settings;
    let tenant_provisioner = TenantProvisioner {
        control_plane_pool: &state.control_plane_pool,
        secret_box: &state.secret_box,
        tenant_database_base_url: &settings.tenant_database_base_url,
    };
    let request = NewTenantRequest {
        slug,
        name: name.to_owned(),
        site_url,
        require_email_verification: body.require_email_verification.unwrap_or(true),
        owner_account_id,
    };
    let provisioned = tenant_provisioner
        .provision(request)
        .await
        .map_err(map_provisioning_error)?;

    Ok(CreatedTenantResponse {
        tenant_id: provisioned.tenant_id,
        slug: provisioned.slug.as_str().to_owned(),
        publishable_key: provisioned.publishable_key,
        secret_key: provisioned.secret_key,
    })
}

fn map_provisioning_error(error: ProvisioningError) -> ApiError {
    match error {
        ProvisioningError::SlugTaken => ApiError::SlugTaken,
        error @ ProvisioningError::ProjectLimitReached(_) => ApiError::Conflict(error.to_string()),
        other => ApiError::internal(other),
    }
}
