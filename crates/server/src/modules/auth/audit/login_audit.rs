use std::net::IpAddr;

use sqlx::PgPool;

use crate::modules::auth::audit::audit_event::NewAuditEvent;
use crate::modules::auth::audit::audit_recorder::record_audit_event;
use crate::modules::auth::audit::login_method::LoginMethod;
use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
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

    let event = NewAuditEvent::failed_password_login(email, ip_address);
    record_audit_event(pool, event).await;
}
