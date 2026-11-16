use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::auth::one_time_token_repository::{OneTimeTokenPurpose, consume_one_time_token};
use crate::auth::session_issuer::SessionTokens;
use crate::auth::user_repository::find_user_by_id;
use crate::http::api_error::ApiError;
use crate::http::routes::session_grant::{SessionGrant, issue_session};
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct OAuthCodeBody {
    #[validate(length(min = 1, max = 256))]
    pub code: String,
}

/// `POST /oauth/token`: trades the one-time code from the OAuth redirect for a session.
pub async fn exchange_oauth_code(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OAuthCodeBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    let purpose = OneTimeTokenPurpose::OAuthLogin;
    let user_id = consume_one_time_token(&tenant.pool, purpose, &body.code)
        .await
        .map_err(ApiError::internal)?;
    let Some(user_id) = user_id else {
        return Err(ApiError::InvalidOAuthCode);
    };
    let user = find_user_by_id(&tenant.pool, user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidOAuthCode);
    };
    let grant = SessionGrant {
        user,
        family_id: Uuid::new_v4(),
    };
    let tokens = issue_session(&state, &tenant, grant).await?;

    Ok(Json(tokens))
}
