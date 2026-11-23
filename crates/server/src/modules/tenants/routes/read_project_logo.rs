use axum::extract::State;
use axum::http::HeaderValue;
use axum::http::header::{CONTENT_TYPE, X_CONTENT_TYPE_OPTIONS};
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::logo::logo_repository::find_logo;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::image::image_file::ImageFile;

const LOGO_CONTENT_TYPE: &str = "image/jpeg";
const NO_SNIFF: &str = "nosniff";

/// `GET /admin/logo`: the project's logo, for the people who manage it.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/logo",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The logo, a square JPEG", content_type = "image/jpeg", body = ImageFile),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "The project has no logo", body = ErrorBody),
    )
)]
pub async fn read_project_logo(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Response, ApiError> {
    let logo = find_logo(&state.control_plane_pool, admin.tenant_id).await?;
    let logo = logo.ok_or(ApiError::NotFound("logo"))?;

    Ok((logo_headers(), logo).into_response())
}

/// Replaces the headers the byte body would set (`application/octet-stream`).
fn logo_headers() -> [(&'static str, HeaderValue); 2] {
    [
        (
            CONTENT_TYPE.as_str(),
            HeaderValue::from_static(LOGO_CONTENT_TYPE),
        ),
        (
            X_CONTENT_TYPE_OPTIONS.as_str(),
            HeaderValue::from_static(NO_SNIFF),
        ),
    ]
}
