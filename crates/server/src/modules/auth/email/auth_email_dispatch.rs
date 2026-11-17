use std::sync::Arc;

use uuid::Uuid;

use crate::modules::auth::email::auth_email::{
    AuthEmailContext, magic_link_email, password_reset_email, verification_email,
};
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::{
    OneTimeTokenRequest, issue_one_time_token,
};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_delivery::send_tenant_email_in_background;
use crate::shared::http::api_error::ApiError;

#[derive(Debug, Clone, Copy)]
pub enum AuthEmailKind {
    Verification,
    PasswordReset,
    MagicLink,
}

impl AuthEmailKind {
    fn token_purpose(self) -> OneTimeTokenPurpose {
        match self {
            Self::Verification => OneTimeTokenPurpose::EmailVerification,
            Self::PasswordReset => OneTimeTokenPurpose::PasswordReset,
            Self::MagicLink => OneTimeTokenPurpose::MagicLink,
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
    mailer: &AuthMailer,
    tenant: &TenantContext,
    request: AuthEmailRequest<'_>,
) -> Result<(), ApiError> {
    let user = request.user;
    let kind = request.kind;
    let token = issue_one_time_token(&tenant.pool, kind.token_request(user.id)).await?;
    let link = AuthEmailLink {
        user,
        kind,
        token: &token,
    };

    email_auth_link(mailer, tenant.tenant_id, &link).await
}

/// Emails a link whose token the caller issued (e.g. inside its own transaction).
pub async fn email_auth_link(
    mailer: &AuthMailer,
    tenant_id: Uuid,
    link: &AuthEmailLink<'_>,
) -> Result<(), ApiError> {
    let user = link.user;
    let token = link.token;
    let settings = load_tenant_settings(&mailer.control_plane_pool, tenant_id).await?;
    let context = AuthEmailContext {
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let content = match link.kind {
        AuthEmailKind::Verification => verification_email(&context, token),
        AuthEmailKind::PasswordReset => password_reset_email(&context, token),
        AuthEmailKind::MagicLink => magic_link_email(&context, token),
    };
    let email = render_auth_email(content, &user.email).map_err(ApiError::internal)?;
    send_tenant_email_in_background(Arc::clone(&mailer.email_senders), tenant_id, email);

    Ok(())
}
