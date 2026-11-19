use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_actor::AuditActor;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::audit::login_method::LoginMethod;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

/// Records a login that opened a session. One that still needs its MFA code is recorded when
/// the code is accepted, as a `totp` login.
pub async fn record_login(
    pool: &PgPool,
    response: &LoginResponse,
    (method, origin): (LoginMethod, RequestOrigin),
) {
    let tokens = match response {
        LoginResponse::Session(tokens) => tokens,
        _ => return,
    };
    let event = NewAuditEvent {
        login_method: Some(method),
        ..NewAuditEvent::by_user(AuditAction::LoggedIn, tokens.user.id, origin)
    };

    record_audit_event(pool, event).await;
}

/// Records a wrong email or password, and a login the attempt limit refused; any other failure
/// (ban, unverified email) is not a guess.
pub async fn record_failed_password_login(
    pool: &PgPool,
    error: &ApiError,
    (email, origin): (&str, RequestOrigin),
) {
    let action = match failed_login_action(error) {
        Some(action) => action,
        None => return,
    };
    // A text that is not an address is often a password typed into the wrong field: it is
    // never stored nor looked up.
    let email = EmailAddress::parse(email).ok();
    let user_id = match &email {
        Some(address) => account_named_by(pool, address).await,
        None => None,
    };
    let attempt = FailedAttempt {
        email: email.as_ref(),
        user_id,
        origin,
    };

    record_audit_event(pool, failed_login(action, attempt)).await;
}

fn failed_login_action(error: &ApiError) -> Option<AuditAction> {
    if let ApiError::RateLimited(_) = error {
        return Some(AuditAction::LoginRateLimited);
    }

    if error.rejection_code() == Some(AuthRejection::InvalidCredentials.code()) {
        return Some(AuditAction::LoginFailed);
    }

    None
}

struct FailedAttempt<'a> {
    email: Option<&'a EmailAddress>,
    user_id: Option<Uuid>,
    origin: RequestOrigin,
}

/// The typed email is kept because it may match no user (someone probing for accounts);
/// `user_id` is the account it names, so the attempt shows on that user's page. Only a valid
/// address is ever passed: text that is not one is often a password typed (or autofilled) into
/// the wrong field, and must never be stored.
fn failed_login(action: AuditAction, attempt: FailedAttempt<'_>) -> NewAuditEvent {
    NewAuditEvent {
        action,
        user_id: attempt.user_id,
        email: attempt.email.map(|address| address.as_str().to_owned()),
        actor: AuditActor::USER,
        login_method: Some(LoginMethod::Password),
        origin: Some(attempt.origin),
        details: None,
    }
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

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr};
    use std::time::Duration;

    use super::*;

    fn origin() -> RequestOrigin {
        RequestOrigin::from_ip(IpAddr::V4(Ipv4Addr::LOCALHOST))
    }

    #[test]
    fn names_the_account_a_failed_login_was_for() -> Result<(), Box<dyn std::error::Error>> {
        let email = EmailAddress::parse(" Ana@Example.com ")?;
        let user_id = Uuid::new_v4();
        let attempt = FailedAttempt {
            email: Some(&email),
            user_id: Some(user_id),
            origin: origin(),
        };
        let event = failed_login(AuditAction::LoginFailed, attempt);

        assert_eq!(event.email.as_deref(), Some("ana@example.com"));
        assert_eq!(event.user_id, Some(user_id));
        Ok(())
    }

    #[test]
    fn keeps_no_email_when_none_was_valid() {
        let attempt = FailedAttempt {
            email: None,
            user_id: None,
            origin: origin(),
        };
        let event = failed_login(AuditAction::LoginFailed, attempt);

        assert_eq!(event.email, None);
        assert_eq!(event.user_id, None);
    }

    #[test]
    fn records_guesses_and_throttled_logins_only() {
        let wrong = ApiError::from(AuthRejection::InvalidCredentials);
        let throttled = ApiError::RateLimited(Duration::from_secs(30));
        let taken = ApiError::from(AuthRejection::EmailTaken);

        assert_eq!(failed_login_action(&wrong), Some(AuditAction::LoginFailed));
        assert_eq!(
            failed_login_action(&throttled),
            Some(AuditAction::LoginRateLimited)
        );
        assert_eq!(failed_login_action(&taken), None);
    }
}
