use sqlx::PgPool;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::invalidate_pending_tokens;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_account_updates::replace_unverified_password;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;

/// Lets a new signup take over an account whose email was never verified.
///
/// Nobody has proven they own that inbox, so the latest signup takes the account over: its
/// password replaces the old one, the old sessions end and the old verification links stop
/// working. Otherwise whoever signed up first would keep their password after the real owner
/// verifies the email.
///
/// Returns `None` when the account is already verified (it has a proven owner, nothing changes).
pub async fn take_over_unverified_account(
    pool: &PgPool,
    email: &EmailAddress,
    password_hash: &str,
) -> Result<Option<User>, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let Some(user) = find_user_by_email(&mut *transaction, email).await? else {
        return Ok(None);
    };
    let replaced = replace_unverified_password(&mut transaction, user.id, password_hash).await?;

    if replaced.is_none() {
        return Ok(None);
    }

    end_all_user_sessions(&mut transaction, user.id).await?;
    let purpose = OneTimeTokenPurpose::EmailVerification;
    invalidate_pending_tokens(&mut transaction, user.id, purpose).await?;
    transaction.commit().await?;

    Ok(Some(user))
}
