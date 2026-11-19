use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::integration::oauth_identity::{LoginMethod, LoginResponse, record_login};
use crate::modules::oauth::login::code_exchange::{LoginCodeExchange, exchange_login_code};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::ip_blocks::address_guard::ensure_address_allowed;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct OAuthCodeBody {
    #[validate(length(min = 1, max = 256))]
    pub code: String,
    #[validate(length(min = 1, max = 128))]
    pub code_verifier: String,
}

/// `POST /oauth/token`: trades the one-time code from the OAuth redirect for a session. The
/// code is consumed even when the verifier is wrong, so it cannot be guessed against.
#[utoipa::path(
    post,
    path = "/auth/v1/oauth/token",
    tag = "oauth",
    security(("api_key" = [])),
    request_body = OAuthCodeBody,
    responses(
        (status = 200, description = "Logged in, or the MFA step that must come first", body = LoginResponse),
        (status = 401, description = "Invalid or expired code, or wrong code verifier", body = ErrorBody),
    )
)]
pub async fn exchange_oauth_code(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<OAuthCodeBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    ensure_address_allowed(&tenant.pool, origin.client_ip).await?;
    let client_ip = origin.client_ip;
    state
        .rate_limits
        .token_redemption
        .check(tenant.tenant_id, client_ip)?;
    let exchange = LoginCodeExchange {
        code: &body.code,
        code_verifier: &body.code_verifier,
    };

    let response = exchange_login_code(&state.token_signing(), &tenant, exchange).await?;
    let login = (LoginMethod::Oauth, origin);
    record_login(&tenant.pool, &response, login).await;

    Ok(Json(response))
}
