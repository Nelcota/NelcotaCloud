use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::unverified_account_takeover::take_over_unverified_account;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::{InsertUserError, insert_user};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct SignUpBody {
    /// Format is checked by `EmailAddress::parse`, after trimming and lowercasing.
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// A session when the tenant lets unverified users in; otherwise only a note to check the inbox.
#[derive(Serialize)]
#[serde(untagged)]
pub enum SignUpResponse {
    Session(SessionTokens),
    VerificationPending { verification_required: bool },
}

type SignUpResult = Result<(StatusCode, Json<SignUpResponse>), ApiError>;

/// What the signup inserted, or found already registered.
struct SignUpAttempt {
    email: EmailAddress,
    password_hash: String,
    insertion: Result<User, InsertUserError>,
}

/// `POST /signup`.
pub async fn sign_up(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<SignUpBody>,
) -> SignUpResult {
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &body.email,
        client_ip,
    };
    // Before hashing: every signup costs an Argon2 run and may send an email.
    state
        .rate_limits
        .signup
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;
    let email = EmailAddress::parse(&body.email).map_err(ApiError::invalid_request)?;
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
    let settings = load_tenant_settings(&state, tenant.tenant_id).await?;
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    let insertion = insert_user(&tenant.pool, &email, &password_hash).await;
    let signup = SignUpAttempt {
        email,
        password_hash,
        insertion,
    };

    if settings.require_email_verification {
        return sign_up_pending_verification(&state, &tenant, signup).await;
    }

    sign_up_with_session(&state, &tenant, signup.insertion).await
}

async fn sign_up_with_session(
    state: &AppState,
    tenant: &TenantContext,
    insertion: Result<User, InsertUserError>,
) -> SignUpResult {
    let user = insertion.map_err(map_insert_user_error)?;
    send_verification_email(state, tenant, &user).await?;
    let grant = SessionGrant {
        user,
        family: SessionFamily::new_login(),
    };
    let tokens = issue_session(state, tenant, grant).await?;

    Ok((StatusCode::CREATED, Json(SignUpResponse::Session(tokens))))
}

/// Answers the same for new and already registered emails, so signup cannot be used to find
/// out which emails have accounts. An unverified account is taken over by this signup.
async fn sign_up_pending_verification(
    state: &AppState,
    tenant: &TenantContext,
    signup: SignUpAttempt,
) -> SignUpResult {
    let pending = SignUpResponse::VerificationPending {
        verification_required: true,
    };
    let user = match signup.insertion {
        Ok(user) => Some(user),
        Err(InsertUserError::EmailTaken) => {
            take_over_unverified_account(&tenant.pool, &signup.email, &signup.password_hash)
                .await
                .map_err(ApiError::internal)?
        }
        Err(InsertUserError::Database(error)) => return Err(ApiError::internal(error)),
    };

    if let Some(user) = user {
        send_verification_email(state, tenant, &user).await?;
    }

    Ok((StatusCode::ACCEPTED, Json(pending)))
}

async fn send_verification_email(
    state: &AppState,
    tenant: &TenantContext,
    user: &User,
) -> Result<(), ApiError> {
    let verification = AuthEmailRequest {
        user,
        kind: AuthEmailKind::Verification,
    };

    send_auth_email(state, tenant, verification).await
}

fn map_insert_user_error(error: InsertUserError) -> ApiError {
    match error {
        InsertUserError::EmailTaken => ApiError::EmailTaken,
        InsertUserError::Database(database_error) => ApiError::internal(database_error),
    }
}
