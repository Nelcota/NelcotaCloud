use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_metadata::{MetadataObject, check_user_metadata_size};
use crate::modules::auth::user::user_metadata_update::{
    MetadataChange, MetadataExpectations, update_user_metadata,
};
use crate::modules::auth::user::user_response::UserResponse;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UpdateCurrentUserBody {
    /// Replaces the whole document (up to 16 KiB as JSON).
    #[validate(custom(function = check_user_metadata_size))]
    #[schema(value_type = std::collections::HashMap<String, serde_json::Value>)]
    pub user_metadata: MetadataObject,
}

/// `PATCH /user`: the logged-in user replaces their own `user_metadata`. `app_metadata` is
/// refused here (unknown field): only the project's admins write it.
#[utoipa::path(
    patch,
    path = "/auth/v1/user",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    request_body = UpdateCurrentUserBody,
    responses(
        (status = 200, description = "The updated user", body = UserResponse),
        (status = 400, description = "Not a JSON object, or too large", body = ErrorBody),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
        (status = 403, description = "The user is banned", body = ErrorBody),
        (status = 429, description = "Too many changes in a short time", body = ErrorBody),
    )
)]
pub async fn update_current_user(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
    ValidatedJson(body): ValidatedJson<UpdateCurrentUserBody>,
) -> Result<Json<UserResponse>, ApiError> {
    let tenant = &authenticated.tenant;
    let user_id = authenticated.claims.sub;
    let current = find_user_by_id(&tenant.pool, user_id).await?;
    let current = current.ok_or(TenantsRejection::InvalidAccessToken)?;

    if current.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    state
        .rate_limits
        .auth
        .check_profile(tenant.tenant_id, user_id)
        .await?;

    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let change = MetadataChange {
        user_id,
        user_metadata: Some(body.user_metadata),
        app_metadata: None,
    };
    let user = update_user_metadata(
        &tenant.pool,
        change,
        &webhooks,
        (MetadataExpectations::default(), None),
    )
    .await?;
    let change = user.ok_or(TenantsRejection::InvalidAccessToken)?;

    Ok(Json(change.into_user().into()))
}
