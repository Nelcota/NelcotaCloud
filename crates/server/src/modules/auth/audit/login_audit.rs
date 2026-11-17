use std::net::IpAddr;

use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::audit::audit_event::NewAuditEvent;
use crate::modules::auth::audit::audit_recorder::record_audit_event;
use crate::modules::auth::audit::login_method::LoginMethod;
use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::shared::http::api_error::ApiError;

/// Records a login that opened a session. One that still needs its MFA code is recorded when
/// the code is accepted, as a `totp` login.
pub async fn record_login(
    pool: &PgPool,
    response: &LoginResponse,
    (method, ip_address): (LoginMethod, IpAddr),
) {
    let LoginResponse::Session(tokens) = response else {
        return;
    };
    let event = NewAuditEvent::login(tokens.user.id, method, ip_address);

    record_audit_event(pool, event).await;
}

/// Records a wrong email or password; any other failure (rate limit, ban) is not a guess.
pub async fn record_failed_password_login(
    pool: &PgPool,
    error: &ApiError,
    (email, ip_address): (&str, IpAddr),
) {
    if error.rejection_code() != Some(AuthRejection::InvalidCredentials.code()) {
        return;
    }

    // A text that is not an address is often a password typed into the wrong field: it is
    // never stored nor looked up.
    let email = EmailAddress::parse(email).ok();
    let user_id = match &email {
        Some(address) => account_named_by(pool, address).await,
        None => None,
    };
    let event = NewAuditEvent::failed_password_login(email.as_ref(), user_id, ip_address);
    record_audit_event(pool, event).await;
}

/// The id of the account with that email, for the activity log only (the response to the
/// client stays the same either way). A lookup failure is logged and leaves the event unlinked.
async fn account_named_by(pool: &PgPool, email: &EmailAddress) -> Option<Uuid> {
    match find_user_by_email(pool, email).await {
        Ok(user) => user.map(|user| user.id),
        Err(error) => {
            tracing::error!(%error, "could not link a failed login to its account");
            None
        }
    }
}
