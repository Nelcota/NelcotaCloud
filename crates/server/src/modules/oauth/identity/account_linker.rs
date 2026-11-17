use sqlx::error::DatabaseError;
use sqlx::{PgConnection, PgPool};

use crate::modules::auth::user::email_address::{EmailAddress, InvalidEmailAddress};
use crate::modules::auth::user::user_events::{UserEventError, record_user_event};
use crate::modules::auth::user::user_locks::lock_user_by_email;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::{InsertUserError, insert_oauth_user};
use crate::modules::auth::user::verified_inbox_claim::claim_verified_inbox;
use crate::modules::oauth::identity::identity_repository::{
    IdentityKey, find_identity_user, has_provider_identity, insert_identity,
};
use crate::modules::oauth::profile::provider_profile::ProviderProfile;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;

#[derive(Debug, thiserror::Error)]
pub enum AccountLinkError {
    #[error("the provider account has no verified email")]
    NoVerifiedEmail,
    #[error("the account with this email is linked to another account at this provider")]
    ProviderAccountMismatch,
    #[error("another login created the same account or identity concurrently")]
    Conflict,
    #[error(transparent)]
    InvalidEmail(#[from] InvalidEmailAddress),
    #[error("database error while linking OAuth identity: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Webhooks(#[from] UserEventError),
}

/// Finds the user behind a provider identity, linking it to the account with the same
/// verified email, or creating a new account when there is none.
pub async fn resolve_oauth_user(
    pool: &PgPool,
    (provider, profile): (OAuthProvider, &ProviderProfile),
    webhooks: &WebhookRecorder,
) -> Result<User, AccountLinkError> {
    let first_attempt = link_identity(pool, (provider, profile), webhooks).await;
    let Err(AccountLinkError::Conflict) = first_attempt else {
        return first_attempt;
    };

    // The concurrent login committed the account or identity; this attempt now finds it.
    link_identity(pool, (provider, profile), webhooks).await
}

async fn link_identity(
    pool: &PgPool,
    (provider, profile): (OAuthProvider, &ProviderProfile),
    webhooks: &WebhookRecorder,
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

    let user = account_for_email(&mut transaction, (profile, &key), webhooks).await?;
    insert_identity(&mut transaction, user.id, &key)
        .await
        .map_err(map_unique_violation)?;
    transaction.commit().await?;

    Ok(user)
}

/// The account with the provider's verified email: an existing one claimed, or a new one.
/// Linking by email is only safe when the provider vouches for the address.
async fn account_for_email(
    transaction: &mut PgConnection,
    (profile, key): (&ProviderProfile, &IdentityKey<'_>),
    webhooks: &WebhookRecorder,
) -> Result<User, AccountLinkError> {
    let Some(raw_email) = &profile.verified_email else {
        return Err(AccountLinkError::NoVerifiedEmail);
    };
    let email = EmailAddress::parse(raw_email)?;

    if let Some(existing_user) = lock_user_by_email(&mut *transaction, &email).await? {
        return claim_existing_account(transaction, (existing_user, key), webhooks).await;
    }

    let user = insert_oauth_user(transaction, &email)
        .await
        .map_err(map_insert_user_error)?;
    record_user_event(
        transaction,
        webhooks,
        (WebhookEventType::UserCreated, &user),
    )
    .await?;

    Ok(user)
}

/// Links to an existing account with the same email. If that account never verified its
/// email, whoever created it may not own the inbox, so the account is claimed for the provider's
/// verified owner. An account already linked to another identity of this provider is refused,
/// so a recycled email address cannot take over the old account.
async fn claim_existing_account(
    transaction: &mut PgConnection,
    (existing_user, key): (User, &IdentityKey<'_>),
    webhooks: &WebhookRecorder,
) -> Result<User, AccountLinkError> {
    if has_provider_identity(transaction, existing_user.id, key.provider).await? {
        return Err(AccountLinkError::ProviderAccountMismatch);
    }

    Ok(claim_verified_inbox(transaction, existing_user, webhooks).await?)
}

fn map_insert_user_error(error: InsertUserError) -> AccountLinkError {
    match error {
        InsertUserError::EmailTaken => AccountLinkError::Conflict,
        InsertUserError::Database(database_error) => AccountLinkError::Database(database_error),
    }
}

fn map_unique_violation(error: sqlx::Error) -> AccountLinkError {
    let database_error = error.as_database_error();

    if database_error.is_some_and(DatabaseError::is_unique_violation) {
        return AccountLinkError::Conflict;
    }

    AccountLinkError::Database(error)
}
