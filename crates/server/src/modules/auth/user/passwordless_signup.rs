use sqlx::PgPool;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::insert_passwordless_user;

/// The account of `email`, created without a password when there is none (magic links sign
/// people up).
pub async fn find_or_create_passwordless_user(
    pool: &PgPool,
    email: &EmailAddress,
) -> Result<Option<User>, sqlx::Error> {
    if let Some(user) = find_user_by_email(pool, email).await? {
        return Ok(Some(user));
    }

    let mut connection = pool.acquire().await?;

    if let Some(created) = insert_passwordless_user(&mut connection, email).await? {
        return Ok(Some(created));
    }

    // Another request created the account meanwhile.
    find_user_by_email(pool, email).await
}
