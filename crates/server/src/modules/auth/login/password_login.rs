use sqlx::{PgConnection, PgPool};

use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
use crate::modules::auth::password::password_authentication::{
    PasswordAuthenticationError, VerifiedCredentials, authenticate_with_password,
};
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, SessionRequest, TokenSigning};
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::{
    PasswordLock, find_credentials_by_email, lock_if_password_unchanged,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::email_verification_policy::ensure_email_verified;
use crate::shared::http::api_error::ApiError;

/// An email and password typed at login, not validated yet.
pub struct PasswordLogin<'a> {
    pub email: &'a str,
    pub password: String,
}

pub struct PasswordLoginServices<'a> {
    pub control_plane_pool: &'a PgPool,
    pub signing: TokenSigning<'a>,
    pub dummy_password_hash: &'a str,
}

pub async fn log_in_with_password(
    services: &PasswordLoginServices<'_>,
    tenant: &TenantContext,
    login: PasswordLogin<'_>,
) -> Result<LoginResponse, ApiError> {
    let verified = authenticate(&tenant.pool, services.dummy_password_hash, login).await?;
    // Only after the password matched, so it never reveals anything to a wrong password.
    let email_verified_at = verified.user.email_verified_at;
    let pool = services.control_plane_pool;
    ensure_email_verified(pool, tenant.tenant_id, email_verified_at).await?;

    open_session(&services.signing, tenant, verified).await
}

/// Creates the session while holding the user's row with the password just verified, so a
/// password reset racing with this login either makes it fail or revokes what it created.
async fn open_session(
    signing: &TokenSigning<'_>,
    tenant: &TenantContext,
    verified: VerifiedCredentials,
) -> Result<LoginResponse, ApiError> {
    let mut transaction = tenant.pool.begin().await?;
    lock_verified_password(&mut transaction, &verified).await?;
    let user = verified.user;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut transaction,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };
    let response = complete_login(signing, request).await?;
    transaction.commit().await?;

    Ok(response)
}

async fn authenticate(
    pool: &PgPool,
    dummy_password_hash: &str,
    login: PasswordLogin<'_>,
) -> Result<VerifiedCredentials, ApiError> {
    let email = EmailAddress::parse(login.email)
        .map_err(|_| ApiError::from(AuthRejection::InvalidCredentials))?;
    let credentials = find_credentials_by_email(pool, &email).await?;
    let authentication =
        authenticate_with_password(credentials, login.password, dummy_password_hash).await;

    authentication.map_err(|error| match error {
        PasswordAuthenticationError::InvalidCredentials => {
            ApiError::from(AuthRejection::InvalidCredentials)
        }
        PasswordAuthenticationError::Hashing(hashing_error) => ApiError::internal(hashing_error),
    })
}

/// Fails when the password changed since it was verified (e.g. a concurrent reset).
async fn lock_verified_password(
    transaction: &mut PgConnection,
    verified: &VerifiedCredentials,
) -> Result<(), ApiError> {
    let user_id = verified.user.id;
    let password_hash = &verified.password_hash;

    match lock_if_password_unchanged(transaction, user_id, password_hash).await? {
        PasswordLock::Locked => Ok(()),
        PasswordLock::Changed => Err(ApiError::from(AuthRejection::InvalidCredentials)),
        PasswordLock::Banned => Err(ApiError::from(TenantsRejection::UserBanned)),
    }
}
