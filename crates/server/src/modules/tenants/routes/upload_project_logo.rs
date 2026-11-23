use axum::Json;
use axum::body::Bytes;
use axum::extract::State;
use axum::extract::rejection::BytesRejection;
use serde_json::json;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_audit_queue::{
    begin_project_change, commit_project_change,
};
use crate::modules::tenants::audit::project_change::ProjectChange;
use crate::modules::tenants::logo::logo_repository::store_logo;
use crate::modules::tenants::logo::project_logo_view::ProjectLogoView;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::image::image_file::ImageFile;
use crate::shared::image::image_processing::process_square_image;
use crate::shared::image::image_upload_rejection::{map_body_rejection, map_processing_error};

/// `PUT /admin/logo`: the body is the image itself (PNG, JPEG or WebP, up to 1 MiB). The server
/// crops it to a centered square, resizes it and stores it as JPEG.
#[utoipa::path(
    put,
    path = "/auth/v1/admin/logo",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body(
        content = ImageFile,
        content_type = "application/octet-stream",
        description = "The image file: PNG, JPEG or WebP, up to 1 MiB"
    ),
    responses(
        (status = 200, description = "The new logo's version", body = ProjectLogoView),
        (status = 400, description = "Empty, unreadable or unsupported image", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 413, description = "The image is larger than 1 MiB", body = ErrorBody),
        (status = 429, description = "Too many logo changes", body = ErrorBody),
    )
)]
pub async fn upload_project_logo(
    State(state): State<AppState>,
    admin: TenantAdmin,
    upload: Result<Bytes, BytesRejection>,
) -> Result<Json<ProjectLogoView>, ApiError> {
    let tenant_id = admin.tenant_id;
    state
        .rate_limits
        .project_logo_changes
        .check(tenant_id, Uuid::nil())?;
    let upload = upload.map_err(|rejection| map_body_rejection(&rejection))?;
    let logo = process_square_image(upload)
        .await
        .map_err(map_processing_error)?;
    let mut transaction = begin_project_change(&state.control_plane_pool, tenant_id).await?;
    let updated_at = store_logo(&mut transaction, tenant_id, &logo).await?;
    let change = ProjectChange {
        tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "logo", "operation": "upload" }),
    };
    commit_project_change(&state, transaction, change).await?;

    Ok(Json(ProjectLogoView { updated_at }))
}
