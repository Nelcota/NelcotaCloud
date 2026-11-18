use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::avatar::avatar_repository::delete_avatar;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /user/avatar`: removes the profile photo; succeeds when there was none.
#[utoipa::path(
    delete,
    path = "/auth/v1/user/avatar",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 204, description = "Photo removed"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn remove_avatar(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    state
        .rate_limits
        .avatar_change
        .check(tenant.tenant_id, authenticated.claims.sub)?;
    let user_id = authenticated.claims.sub;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let Some(user) = lock_user_by_id(&mut transaction, user_id).await? else {
        return Err(ApiError::from(TenantsRejection::InvalidAccessToken));
    };

    // Like an upload: a banned user's still-valid access token changes nothing.
    if user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    // No photo to remove: nothing changed, nothing to report.
    if delete_avatar(&mut *transaction, user_id).await? == false {
        return Ok(StatusCode::NO_CONTENT);
    }

    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    record_user_change(&mut transaction, &webhooks, change).await?;
    transaction.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}
