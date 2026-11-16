use sqlx::PgPool;

use crate::modules::auth::user::email_address::{EmailAddress, InvalidEmailAddress};
use crate::modules::auth::user::user_account_updates::claim_account_for_verified_email;
use crate::modules::auth::user::user_lookup::find_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::InsertUserError;
use crate::modules::auth::user::user_registration::insert_oauth_user;
use crate::modules::oauth::identity::identity_repository::{
    IdentityKey, find_identity_user, insert_identity,
};
use crate::modules::oauth::profile::provider_profile::ProviderProfile;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;

#[derive(Debug, thiserror::Error)]
pub enum AccountLinkError {
    #[error("the provider account has no verified email")]
    NoVerifiedEmail,
    #[error(transparent)]
    InvalidEmail(#[from] InvalidEmailAddress),
    #[error("database error while linking OAuth identity: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    InsertUser(#[from] InsertUserError),
}

/// Finds the user behind a provider identity, linking it to the account with the same
/// verified email, or creating a new account when there is none.
pub async fn resolve_oauth_user(
    pool: &PgPool,
    provider: OAuthProvider,
    profile: &ProviderProfile,
) -> Result<User, AccountLinkError> {
    let key = IdentityKey {
        provider: provider.as_str(),
        provider_user_id: &profile.provider_user_id,
    };
    let mut transaction = pool.begin().await?;

    if let Some(user) = find_identity_user(&mut transaction, &key).await? {
        transaction.commit().await?;
        return Ok(user);
    }

    // Linking by email is only safe when the provider vouches for the address.
    let Some(raw_email) = &profile.verified_email else {
        return Err(AccountLinkError::NoVerifiedEmail);
    };
    let email = EmailAddress::parse(raw_email)?;
    let existing_user = find_user_by_email(&mut *transaction, &email).await?;
    let user = match existing_user {
        Some(existing_user) => {
            claim_account_for_verified_email(&mut transaction, existing_user.id).await?
        }
        None => insert_oauth_user(&mut transaction, &email).await?,
    };
    insert_identity(&mut transaction, user.id, &key).await?;
    transaction.commit().await?;

    Ok(user)
}
