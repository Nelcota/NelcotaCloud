use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailLink, AuthEmailRequest, email_auth_link, send_auth_email,
};
use crate::modules::auth::one_time_token::one_time_token_repository::issue_one_time_token;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::unverified_account_takeover::take_over_unverified_account;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_user;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::requires_email_verification;
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

/// A validated signup with its password already hashed.
struct NewSignup {
    email: EmailAddress,
    password_hash: String,
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
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    let signup = NewSignup {
        email,
        password_hash,
    };

    if requires_email_verification(&state, tenant.tenant_id).await? {
        return sign_up_pending_verification(&state, &tenant, &signup).await;
    }

    sign_up_with_session(&state, &tenant, &signup).await
}

async fn sign_up_with_session(
    state: &AppState,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> SignUpResult {
    let mut connection = tenant.pool.acquire().await.map_err(ApiError::internal)?;
    let user = insert_user(&mut connection, &signup.email, &signup.password_hash)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::EmailTaken);
    };
    let verification = AuthEmailRequest {
        user: &user,
        kind: AuthEmailKind::Verification,
    };
    send_auth_email(state, tenant, verification).await?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };
    let tokens = issue_session_with(state, request).await?;

    Ok((StatusCode::CREATED, Json(SignUpResponse::Session(tokens))))
}

/// Answers the same for new and already registered emails, so signup cannot be used to find
/// out which emails have accounts. An unverified account is taken over by this signup.
///
/// Registering (or taking over) and issuing the verification link share one transaction, so a
/// concurrent signup for the same email always invalidates the link this one issued.
async fn sign_up_pending_verification(
    state: &AppState,
    tenant: &TenantContext,
    signup: &NewSignup,
) -> SignUpResult {
    let pending = SignUpResponse::VerificationPending {
        verification_required: true,
    };
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let user = register_or_take_over(&mut transaction, signup)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Ok((StatusCode::ACCEPTED, Json(pending)));
    };
    let token_request = AuthEmailKind::Verification.token_request(user.id);
    let token = issue_one_time_token(&mut *transaction, token_request)
        .await
        .map_err(ApiError::internal)?;
    transaction.commit().await.map_err(ApiError::internal)?;
    let link = AuthEmailLink {
        user: &user,
        kind: AuthEmailKind::Verification,
        token: &token,
    };
    email_auth_link(state, tenant.tenant_id, &link).await?;

    Ok((StatusCode::ACCEPTED, Json(pending)))
}

/// `None` when the email belongs to an account that is already verified: nothing changes.
async fn register_or_take_over(
    transaction: &mut PgConnection,
    signup: &NewSignup,
) -> Result<Option<User>, sqlx::Error> {
    let email = &signup.email;
    let password_hash = &signup.password_hash;

    if let Some(user) = insert_user(transaction, email, password_hash).await? {
        return Ok(Some(user));
    }

    take_over_unverified_account(transaction, email, password_hash).await
}
