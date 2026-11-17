use std::net::IpAddr;

use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// An admin asking for a user's verification link to be sent again.
pub struct VerificationResend {
    pub user_id: Uuid,
    pub client_ip: IpAddr,
}

/// Unlike the public resend, the admin already knows the account, so refusals are explicit.
/// The limit is the public one, keyed by the user's address: an admin cannot flood an inbox.
pub async fn resend_verification_email(
    state: &AppState,
    admin: TenantAdminContext,
    resend: &VerificationResend,
) -> Result<(), ApiError> {
    let tenant = TenantContext {
        tenant_id: admin.tenant_id,
        pool: admin.pool,
    };
    let user = find_user_by_id(&tenant.pool, resend.user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::NotFound("user"));
    };

    if user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    if user.email_verified_at.is_some() {
        return Err(ApiError::from(AuthRejection::EmailAlreadyVerified));
    }

    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &user.email,
        client_ip: resend.client_ip,
    };
    state.rate_limits.email_delivery.check(&attempt)?;
    let request = AuthEmailRequest {
        user: &user,
        kind: AuthEmailKind::Verification,
    };

    send_auth_email(&state.auth_mailer(), &tenant, request).await
}
