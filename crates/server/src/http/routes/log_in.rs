use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::auth::email_address::EmailAddress;
use crate::auth::password_hashing::verify_password;
use crate::auth::session_issuer::SessionTokens;
use crate::auth::user_repository::{User, UserCredentials, find_credentials_by_email};
use crate::http::api_error::ApiError;
use crate::http::client_ip::ClientIp;
use crate::http::rate_limits::Attempt;
use crate::http::routes::loaded_tenant_settings::load_tenant_settings;
use crate::http::routes::session_grant::{SessionGrant, issue_session};
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct LogInBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 1, max = 128))]
    pub password: String,
}

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
    let email = EmailAddress::parse(&body.email).map_err(|_| ApiError::InvalidCredentials)?;
    let credentials = find_credentials_by_email(&tenant.pool, &email)
        .await
        .map_err(ApiError::internal)?;
    let dummy_password_hash = &state.settings.dummy_password_hash;
    let user = authenticate(credentials, body.password, dummy_password_hash).await?;
    ensure_email_verified_if_required(&state, &tenant, &user).await?;
    let grant = SessionGrant {
        user,
        family_id: Uuid::new_v4(),
    };
    let tokens = issue_session(&state, &tenant, grant).await?;

    Ok(Json(tokens))
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

/// Always runs one Argon2 verification, even for unknown emails or passwordless (OAuth) users,
/// so response time does not reveal which accounts exist.
async fn authenticate(
    credentials: Option<UserCredentials>,
    password: String,
    dummy_password_hash: &str,
) -> Result<User, ApiError> {
    let stored_hash = credentials
        .as_ref()
        .and_then(|found| found.password_hash.clone());
    let hash_to_check = stored_hash.unwrap_or_else(|| dummy_password_hash.to_owned());

    if verify_password(password, hash_to_check)
        .await
        .map_err(ApiError::internal)?
        == false
    {
        return Err(ApiError::InvalidCredentials);
    }

    let Some(credentials) = credentials else {
        return Err(ApiError::InvalidCredentials);
    };

    Ok(credentials.user)
}
