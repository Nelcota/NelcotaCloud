use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::signup::{NewSignup, SignupOutcome, sign_up_user};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct SignUpBody {
    /// Format is checked by `EmailAddress::parse`, after trimming and lowercasing.
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// A session when the tenant lets unverified users in; otherwise only a note to check the inbox.
#[derive(Serialize, ToSchema)]
#[serde(untagged)]
pub enum SignUpResponse {
    Session(SessionTokens),
    VerificationPending { verification_required: bool },
}

type SignUpResult = Result<(StatusCode, Json<SignUpResponse>), ApiError>;

/// `POST /signup`.
#[utoipa::path(
    post,
    path = "/auth/v1/signup",
    tag = "auth",
    security(("api_key" = [])),
    request_body = SignUpBody,
    responses(
        (status = 201, description = "Account created and logged in (email verification off)", body = SignUpResponse),
        (status = 202, description = "Check the inbox; same answer for new and existing emails", body = SignUpResponse),
        (status = 400, description = "Invalid email or weak password", body = ErrorBody),
        (status = 409, description = "Email already registered (email verification off)", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
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
    state.rate_limits.signup.check(&attempt)?;
    let email = EmailAddress::parse(&body.email).map_err(ApiError::invalid_request)?;
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    let signup = NewSignup {
        email,
        password_hash,
    };

    let outcome = sign_up_user(&state, &tenant, &signup).await?;

    Ok(signup_response(outcome))
}

fn signup_response(outcome: SignupOutcome) -> (StatusCode, Json<SignUpResponse>) {
    match outcome {
        SignupOutcome::Session(tokens) => {
            (StatusCode::CREATED, Json(SignUpResponse::Session(tokens)))
        }
        SignupOutcome::VerificationPending => {
            let pending = SignUpResponse::VerificationPending {
                verification_required: true,
            };
            (StatusCode::ACCEPTED, Json(pending))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_pending_verification_is_accepted_not_created() {
        let (status, _) = signup_response(SignupOutcome::VerificationPending);

        assert_eq!(status, StatusCode::ACCEPTED);
    }
}
