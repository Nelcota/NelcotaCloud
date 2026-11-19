use serde::Serialize;
use utoipa::ToSchema;

use crate::modules::auth::mfa::mfa_challenge_repository::create_mfa_challenge;
use crate::modules::auth::mfa::mfa_factor_repository::has_verified_mfa_factor;
use crate::modules::auth::session::session_grant::{
    SessionRequest, TokenSigning, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// The first factor passed; with MFA on, a TOTP code is still needed at `POST /mfa/challenge`.
#[derive(Debug, Serialize, ToSchema)]
pub struct MfaRequired {
    pub mfa_required: bool,
    /// Short-lived token that identifies this login attempt at the challenge endpoint.
    pub mfa_token: String,
}

/// A session, or the MFA step that must come first.
#[derive(Debug, Serialize, ToSchema)]
#[serde(untagged)]
pub enum LoginResponse {
    Session(Box<SessionTokens>),
    MfaRequired(MfaRequired),
}

/// Ends every login that proved the first factor (password, magic link, OAuth): a user with a
/// verified authenticator gets an MFA challenge instead of tokens.
pub async fn complete_login(
    signing: &TokenSigning<'_>,
    request: SessionRequest<'_>,
) -> Result<LoginResponse, ApiError> {
    let user = &request.grant.user;

    if user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    let has_mfa = has_verified_mfa_factor(&mut *request.connection, user.id).await;

    if has_mfa? {
        let mfa_token = create_mfa_challenge(&mut *request.connection, user.id).await?;
        let required = MfaRequired {
            mfa_required: true,
            mfa_token,
        };
        return Ok(LoginResponse::MfaRequired(required));
    }

    Ok(LoginResponse::Session(Box::new(
        issue_session_with(signing, request).await?,
    )))
}
