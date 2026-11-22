use std::sync::Arc;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::email::auth_email::{AuthEmailContext, auth_link_email};
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::email::email_template_repository::TemplateKey;
use crate::modules::auth::email::email_template_view::effective_template_text;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::{
    OneTimeTokenRequest, issue_one_time_token,
};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_delivery::{
    send_tenant_email, send_tenant_email_in_background,
};
use crate::shared::email::outgoing_email::OutgoingEmail;
use crate::shared::http::api_error::ApiError;

/// The emails that carry a one-time link; each has its own wording per project.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
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
    pub address: &'a str,
    pub kind: AuthEmailKind,
    pub token: &'a str,
}

impl AuthEmailKind {
    pub fn token_request(self, user_id: Uuid) -> OneTimeTokenRequest<'static> {
        OneTimeTokenRequest {
            user_id,
            purpose: self.token_purpose(),
            code_challenge: None,
            oauth_context: None,
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
        address: &user.email,
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
    let email = prepare_email(mailer, tenant_id, link.address, (link.kind, link.token)).await?;
    send_tenant_email_in_background(Arc::clone(&mailer.email_senders), tenant_id, email);

    Ok(())
}

/// For an existing background job that records delivery only after SMTP accepts it.
pub async fn deliver_auth_link(
    mailer: &AuthMailer,
    tenant_id: Uuid,
    address: &str,
    link: (AuthEmailKind, &str),
) -> Result<bool, ApiError> {
    let email = prepare_email(mailer, tenant_id, address, link).await?;

    Ok(send_tenant_email(&mailer.email_senders, tenant_id, email).await)
}

async fn prepare_email(
    mailer: &AuthMailer,
    tenant_id: Uuid,
    address: &str,
    (kind, token): (AuthEmailKind, &str),
) -> Result<OutgoingEmail, ApiError> {
    let pool = &mailer.control_plane_pool;
    let settings = load_tenant_settings(pool, tenant_id).await?;
    let key = TemplateKey { tenant_id, kind };
    let text = effective_template_text(pool, key).await?;
    let context = AuthEmailContext {
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let content = auth_link_email(&context, &text, (kind, token));

    render_auth_email(content, address).map_err(ApiError::internal)
}
