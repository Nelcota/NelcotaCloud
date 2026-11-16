use std::sync::Arc;

use crate::app_state::AppState;
use crate::auth::one_time_token_repository::{OneTimeTokenPurpose, issue_one_time_token};
use crate::auth::user_repository::User;
use crate::email::auth_email::{AuthEmailContext, password_reset_email, verification_email};
use crate::email::email_sender::send_in_background;
use crate::http::api_error::ApiError;
use crate::http::routes::loaded_tenant_settings::load_tenant_settings;
use crate::http::tenant_context::TenantContext;

#[derive(Debug, Clone, Copy)]
pub enum AuthEmailKind {
    Verification,
    PasswordReset,
}

impl AuthEmailKind {
    fn token_purpose(self) -> OneTimeTokenPurpose {
        match self {
            AuthEmailKind::Verification => OneTimeTokenPurpose::EmailVerification,
            AuthEmailKind::PasswordReset => OneTimeTokenPurpose::PasswordReset,
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
    let Some(site_url) = settings.site_url else {
        tracing::warn!(tenant_id = %tenant.tenant_id, "tenant has no site_url; auth email skipped");
        return Ok(());
    };
    let token = issue_one_time_token(&tenant.pool, user.id, kind.token_purpose())
        .await
        .map_err(ApiError::internal)?;
    let context = AuthEmailContext {
        recipient: &user.email,
        tenant_name: &settings.name,
        site_url: &site_url,
    };
    let email = match kind {
        AuthEmailKind::Verification => verification_email(&context, &token),
        AuthEmailKind::PasswordReset => password_reset_email(&context, &token),
    };
    send_in_background(Arc::clone(&state.email_sender), email);

    Ok(())
}
