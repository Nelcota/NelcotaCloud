//! Auth capabilities needed when OAuth proves an identity and finishes a login.

pub(crate) use crate::modules::auth::audit::login_audit::record_login;
pub(crate) use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
pub(crate) use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
pub(crate) use crate::modules::auth::one_time_token::one_time_token_repository::{
    OneTimeTokenRequest, consume_one_time_token, issue_one_time_token,
};
pub(crate) use crate::modules::auth::session::session_family::SessionFamily;
pub(crate) use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, TokenSigning,
};
pub(crate) use crate::modules::auth::user::email_address::{EmailAddress, InvalidEmailAddress};
pub(crate) use crate::modules::auth::user::user_events::{UserEventError, record_user_event};
pub(crate) use crate::modules::auth::user::user_locks::lock_user_by_email;
pub(crate) use crate::modules::auth::user::user_lookup::find_user_by_id;
pub(crate) use crate::modules::auth::user::user_record::User;
pub(crate) use crate::modules::auth::user::user_registration::{
    InsertUserError, insert_oauth_user,
};
pub(crate) use crate::modules::auth::user::verified_inbox_claim::claim_verified_inbox;
pub(crate) use crate::modules::tenants::audit::login_method::LoginMethod;
