use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::auth::routes::ban_user;
use crate::modules::auth::routes::complete_mfa_challenge;
use crate::modules::auth::routes::current_user;
use crate::modules::auth::routes::delete_own_account;
use crate::modules::auth::routes::delete_user;
use crate::modules::auth::routes::disable_totp;
use crate::modules::auth::routes::end_other_sessions;
use crate::modules::auth::routes::end_session;
use crate::modules::auth::routes::end_user_sessions;
use crate::modules::auth::routes::enroll_totp;
use crate::modules::auth::routes::get_user;
use crate::modules::auth::routes::jwks;
use crate::modules::auth::routes::list_sessions;
use crate::modules::auth::routes::list_users;
use crate::modules::auth::routes::log_in;
use crate::modules::auth::routes::log_out;
use crate::modules::auth::routes::read_avatar;
use crate::modules::auth::routes::read_mfa_status;
use crate::modules::auth::routes::recover_password;
use crate::modules::auth::routes::refresh_session;
use crate::modules::auth::routes::remove_avatar;
use crate::modules::auth::routes::request_magic_link;
use crate::modules::auth::routes::resend_verification;
use crate::modules::auth::routes::reset_password;
use crate::modules::auth::routes::reset_user_mfa;
use crate::modules::auth::routes::send_smtp_test;
use crate::modules::auth::routes::sign_up;
use crate::modules::auth::routes::unban_user;
use crate::modules::auth::routes::upload_avatar;
use crate::modules::auth::routes::verify_email;
use crate::modules::auth::routes::verify_magic_link;
use crate::modules::auth::routes::verify_totp_enrollment;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn auth_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(account_routes())
        .merge(email_link_routes())
        .merge(mfa_routes())
        .merge(user_admin_routes())
}

/// Signup, login, sessions and the user's own account.
fn account_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(sign_up::sign_up))
        .routes(routes!(log_in::log_in))
        .routes(routes!(refresh_session::refresh_session))
        .routes(routes!(log_out::log_out))
        .routes(routes!(
            current_user::current_user,
            delete_own_account::delete_own_account
        ))
        .routes(routes!(
            upload_avatar::upload_avatar,
            remove_avatar::remove_avatar
        ))
        .routes(routes!(read_avatar::read_avatar))
        .routes(routes!(jwks::jwks))
        .routes(routes!(
            list_sessions::list_sessions,
            end_other_sessions::end_other_sessions
        ))
        .routes(routes!(end_session::end_session))
}

/// Links sent by email: verification, password reset, magic links, and the SMTP test.
fn email_link_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(verify_email::verify_email))
        .routes(routes!(resend_verification::resend_verification))
        .routes(routes!(recover_password::recover_password))
        .routes(routes!(reset_password::reset_password))
        .routes(routes!(send_smtp_test::send_smtp_test))
        .routes(routes!(request_magic_link::request_magic_link))
        .routes(routes!(verify_magic_link::verify_magic_link))
}

fn mfa_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(read_mfa_status::read_mfa_status))
        .routes(routes!(
            enroll_totp::enroll_totp,
            disable_totp::disable_totp
        ))
        .routes(routes!(verify_totp_enrollment::verify_totp_enrollment))
        .routes(routes!(complete_mfa_challenge::complete_mfa_challenge))
}

/// What a tenant's admin does to its users.
fn user_admin_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(reset_user_mfa::reset_user_mfa))
        .routes(routes!(list_users::list_users))
        .routes(routes!(get_user::get_user, delete_user::delete_user))
        .routes(routes!(ban_user::ban_user))
        .routes(routes!(unban_user::unban_user))
        .routes(routes!(end_user_sessions::end_user_sessions))
}
