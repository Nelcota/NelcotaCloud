use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use sqlx::PgConnection;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::mfa::mfa_challenge_repository::{
    consume_mfa_challenge, lock_mfa_challenge, record_failed_mfa_attempt,
};
use crate::modules::auth::mfa::mfa_factor_repository::find_mfa_factor;
use crate::modules::auth::mfa::totp_verification::{TotpAttempt, accept_totp_code};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::crypto::opaque_token::{TokenHash, hash_opaque_token};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct MfaChallengeBody {
    /// The `mfa_token` returned by the login.
    #[validate(length(min = 1, max = 256))]
    pub mfa_token: String,
    #[validate(length(min = 6, max = 10))]
    pub code: String,
}

/// `POST /mfa/challenge`: the second step of a login with MFA on. Each challenge allows a few
/// wrong codes; after that the login starts over.
#[utoipa::path(
    post,
    path = "/auth/v1/mfa/challenge",
    tag = "mfa",
    security(("api_key" = [])),
    request_body = MfaChallengeBody,
    responses(
        (status = 200, description = "Logged in", body = SessionTokens),
        (status = 400, description = "Unknown, expired or exhausted MFA token", body = ErrorBody),
        (status = 401, description = "Wrong code", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn complete_mfa_challenge(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<MfaChallengeBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    let token_hash = hash_opaque_token(body.mfa_token.trim());
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let user = challenged_user(&mut transaction, &token_hash).await?;
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &user.email,
        client_ip,
    };
    state
        .rate_limits
        .mfa
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;
    let code_check = CodeCheck {
        state: &state,
        tenant: &tenant,
        user: &user,
        code: &body.code,
    };

    if code_check.accept(&mut transaction).await? == false {
        record_failed_mfa_attempt(&mut transaction, &token_hash)
            .await
            .map_err(ApiError::internal)?;
        transaction.commit().await.map_err(ApiError::internal)?;
        return Err(ApiError::InvalidMfaCode);
    }

    consume_mfa_challenge(&mut transaction, &token_hash)
        .await
        .map_err(ApiError::internal)?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut transaction,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };
    let tokens = issue_session_with(&state, request).await?;
    transaction.commit().await.map_err(ApiError::internal)?;

    Ok(Json(tokens))
}

/// The user of a usable challenge, with the challenge locked until the transaction ends.
async fn challenged_user(
    transaction: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<User, ApiError> {
    let user_id = lock_mfa_challenge(transaction, token_hash)
        .await
        .map_err(ApiError::internal)?;
    let Some(user_id) = user_id else {
        return Err(ApiError::InvalidToken);
    };
    let user = find_user_by_id(&mut *transaction, user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidToken);
    };

    Ok(user)
}

/// A TOTP code typed at the challenge.
struct CodeCheck<'a> {
    state: &'a AppState,
    tenant: &'a TenantContext,
    user: &'a User,
    code: &'a str,
}

impl CodeCheck<'_> {
    async fn accept(&self, transaction: &mut PgConnection) -> Result<bool, ApiError> {
        let factor = find_mfa_factor(&mut *transaction, self.user.id)
            .await
            .map_err(ApiError::internal)?;
        // Removed (e.g. by an admin) since the login started: nothing to check against.
        let Some(factor) = factor.filter(|factor| factor.verified_at.is_some()) else {
            return Err(ApiError::InvalidToken);
        };
        let attempt = TotpAttempt {
            tenant_id: self.tenant.tenant_id,
            factor: &factor,
            code: self.code,
        };

        accept_totp_code(transaction, &self.state.secret_box, attempt)
            .await
            .map_err(ApiError::internal)
    }
}
