use std::sync::Arc;

use uuid::Uuid;

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

/// An already issued link token to email to its user.
pub struct AuthEmailLink<'a> {
    pub user: &'a User,
    pub kind: AuthEmailKind,
    pub token: &'a str,
}

impl AuthEmailKind {
    pub fn token_request(self, user_id: Uuid) -> OneTimeTokenRequest<'static> {
        OneTimeTokenRequest {
            user_id,
            purpose: self.token_purpose(),
            code_challenge: None,
        }
    }
}

/// Issues a one-time token and emails its link to the user, in the background.
pub async fn send_auth_email(
    state: &AppState,
    tenant: &TenantContext,
    request: AuthEmailRequest<'_>,
) -> Result<(), ApiError> {
    let user = request.user;
    let kind = request.kind;
    let token = issue_one_time_token(&tenant.pool, kind.token_request(user.id))
        .await
        .map_err(ApiError::internal)?;
    let link = AuthEmailLink {
        user,
        kind,
        token: &token,
    };

    email_auth_link(state, tenant.tenant_id, &link).await
}

/// Emails a link whose token the caller issued (e.g. inside its own transaction).
pub async fn email_auth_link(
    state: &AppState,
    tenant_id: Uuid,
    link: &AuthEmailLink<'_>,
) -> Result<(), ApiError> {
    let user = link.user;
    let token = link.token;
    let settings = load_tenant_settings(state, tenant_id).await?;
    let context = AuthEmailContext {
        recipient: &user.email,
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let email = match link.kind {
        AuthEmailKind::Verification => verification_email(&context, token),
        AuthEmailKind::PasswordReset => password_reset_email(&context, token),
    };
    send_in_background(Arc::clone(&state.email_sender), email);

    Ok(())
}
