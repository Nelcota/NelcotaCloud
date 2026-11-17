use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/users/{user_id}/mfa`: removes the user's authenticator (e.g. a lost phone),
/// after the tenant confirmed who they are by its own means.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/users/{user_id}/mfa",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 204, description = "Authenticator removed"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "The user has no authenticator", body = ErrorBody),
    )
)]
pub async fn reset_user_mfa(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let mut transaction = admin.pool.begin().await?;
    let deleted = delete_mfa_factor(&mut *transaction, user_id).await?;

    if deleted == false {
        return Err(ApiError::NotFound("authenticator"));
    }

    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    record_user_change(&mut transaction, &webhooks, change).await?;
    transaction.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}
