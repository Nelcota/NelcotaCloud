use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::password::password_authentication::{
    PasswordAuthenticationError, VerifiedCredentials, authenticate_with_password,
};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::{
    find_credentials_by_email, lock_if_password_unchanged,
};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::requires_email_verification;
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
    let verified = authenticate(&state, &tenant, body).await?;
    ensure_email_verified_if_required(&state, &tenant, &verified.user).await?;

    Ok(Json(open_session(&state, &tenant, verified).await?))
}

/// Creates the session while holding the user's row with the password just verified, so a
/// password reset racing with this login either makes it fail or revokes what it created.
async fn open_session(
    state: &AppState,
    tenant: &TenantContext,
    verified: VerifiedCredentials,
) -> Result<SessionTokens, ApiError> {
    let user = verified.user;
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let password_check =
        lock_if_password_unchanged(&mut transaction, user.id, &verified.password_hash).await;

    if password_check.map_err(ApiError::internal)? == false {
        return Err(ApiError::InvalidCredentials);
    }

    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut transaction,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };
    let tokens = issue_session_with(state, request).await?;
    transaction.commit().await.map_err(ApiError::internal)?;

    Ok(tokens)
}

async fn authenticate(
    state: &AppState,
    tenant: &TenantContext,
    body: LogInBody,
) -> Result<VerifiedCredentials, ApiError> {
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
    if user.email_verified_at.is_none()
        && requires_email_verification(state, tenant.tenant_id).await?
    {
        return Err(ApiError::EmailNotVerified);
    }

    Ok(())
}
