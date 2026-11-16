use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::password::password_authentication::{
    PasswordAuthenticationError, authenticate_with_password,
};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::find_credentials_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct LogInBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 1, max = 128))]
    pub password: String,
}

/// `POST /login`: email and password.
pub async fn log_in(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<LogInBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &body.email,
        client_ip,
    };
    // Checked before hashing, so rejected attempts cost no Argon2 work.
    state
        .rate_limits
        .login
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;
    let user = authenticate(&state, &tenant, body).await?;
    ensure_email_verified_if_required(&state, &tenant, &user).await?;
    let grant = SessionGrant {
        user,
        family: SessionFamily::new_login(),
    };

    Ok(Json(issue_session(&state, &tenant, grant).await?))
}

async fn authenticate(
    state: &AppState,
    tenant: &TenantContext,
    body: LogInBody,
) -> Result<User, ApiError> {
    let email = EmailAddress::parse(&body.email).map_err(|_| ApiError::InvalidCredentials)?;
    let credentials = find_credentials_by_email(&tenant.pool, &email)
        .await
        .map_err(ApiError::internal)?;
    let dummy_password_hash = &state.settings.dummy_password_hash;
    let authentication =
        authenticate_with_password(credentials, body.password, dummy_password_hash).await;

    authentication.map_err(|error| match error {
        PasswordAuthenticationError::InvalidCredentials => ApiError::InvalidCredentials,
        PasswordAuthenticationError::Hashing(hashing_error) => ApiError::internal(hashing_error),
    })
}

/// Runs only after the password matched, so it never reveals anything to a wrong password.
async fn ensure_email_verified_if_required(
    state: &AppState,
    tenant: &TenantContext,
    user: &User,
) -> Result<(), ApiError> {
    let settings = load_tenant_settings(state, tenant.tenant_id).await?;

    if settings.require_email_verification && user.email_verified_at.is_none() {
        return Err(ApiError::EmailNotVerified);
    }

    Ok(())
}
