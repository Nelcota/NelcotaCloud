use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::ApiError;

/// The token's email, normalized like invitation emails; a token without a usable email
/// matches no invitation.
pub fn invited_email_of(account: &PlatformAccount) -> Result<EmailAddress, ApiError> {
    EmailAddress::parse(&account.email).map_err(|_| ApiError::NotFound("invitation"))
}
