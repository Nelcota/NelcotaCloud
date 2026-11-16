use std::sync::Arc;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email::{
    AuthEmailContext, password_reset_email, verification_email,
};
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::{
    OneTimeTokenRequest, issue_one_time_token,
};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::email::email_sender::send_in_background;
use crate::shared::http::api_error::ApiError;

#[derive(Debug, Clone, Copy)]
pub enum AuthEmailKind {
    Verification,
    PasswordReset,
}

impl AuthEmailKind {
    fn token_purpose(self) -> OneTimeTokenPurpose {
        match self {
            Self::Verification => OneTimeTokenPurpose::EmailVerification,
            Self::PasswordReset => OneTimeTokenPurpose::PasswordReset,
        }
    }
}

pub struct AuthEmailRequest<'a> {
    pub user: &'a User,
    pub kind: AuthEmailKind,
}

/// Issues a one-time token and emails its link to the user, in the background.
pub async fn send_auth_email(
    state: &AppState,
    tenant: &TenantContext,
    request: AuthEmailRequest<'_>,
) -> Result<(), ApiError> {
    let user = request.user;
    let kind = request.kind;
    let settings = load_tenant_settings(state, tenant.tenant_id).await?;
    let token_request = OneTimeTokenRequest {
        user_id: user.id,
        purpose: kind.token_purpose(),
        code_challenge: None,
    };
    let token = issue_one_time_token(&tenant.pool, token_request)
        .await
        .map_err(ApiError::internal)?;
    let context = AuthEmailContext {
        recipient: &user.email,
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let email = match kind {
        AuthEmailKind::Verification => verification_email(&context, &token),
        AuthEmailKind::PasswordReset => password_reset_email(&context, &token),
    };
    send_in_background(Arc::clone(&state.email_sender), email);

    Ok(())
}
