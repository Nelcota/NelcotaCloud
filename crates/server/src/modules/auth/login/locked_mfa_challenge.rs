use sqlx::{PgConnection, PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_challenge_repository::{
    consume_mfa_challenge, lock_challenge_owner, lock_mfa_challenge, record_failed_mfa_attempt,
};
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, TokenSigning, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::shared::crypto::opaque_token::{TokenHash, hash_opaque_token};
use crate::shared::http::api_error::ApiError;

/// A usable MFA challenge and its user, locked by its transaction until it ends.
pub struct LockedChallenge<'t> {
    pub transaction: Transaction<'t, Postgres>,
    pub user: User,
    token_hash: TokenHash,
}

impl LockedChallenge<'_> {
    /// `invalid_token` for unknown, expired or exhausted challenges.
    pub async fn lock(tenant_pool: &PgPool, mfa_token: &str) -> Result<Self, ApiError> {
        let token_hash = hash_opaque_token(mfa_token.trim());
        let mut transaction = tenant_pool.begin().await?;
        let user = challenged_user(&mut transaction, &token_hash).await?;

        Ok(LockedChallenge {
            transaction,
            user,
            token_hash,
        })
    }

    /// Counts a wrong code against the challenge, committed even though the request fails.
    pub async fn reject(mut self) -> ApiError {
        let recorded = record_failed_mfa_attempt(&mut self.transaction, &self.token_hash).await;

        if let Err(error) = recorded {
            return ApiError::internal(error);
        }

        if let Err(error) = self.transaction.commit().await {
            return ApiError::internal(error);
        }

        ApiError::from(AuthRejection::InvalidMfaCode)
    }

    /// Uses the challenge up and starts the session, in the same transaction.
    pub async fn start_session(
        mut self,
        signing: &TokenSigning<'_>,
        tenant_id: Uuid,
    ) -> Result<SessionTokens, ApiError> {
        consume_mfa_challenge(&mut self.transaction, &self.token_hash).await?;
        let request = SessionRequest {
            tenant_id,
            connection: &mut self.transaction,
            grant: SessionGrant {
                user: self.user,
                family: SessionFamily::new_login(),
            },
        };
        let tokens = issue_session_with(signing, request).await?;
        self.transaction.commit().await?;

        Ok(tokens)
    }
}

/// The user of a usable challenge, with the challenge locked until the transaction ends.
async fn challenged_user(
    transaction: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<User, ApiError> {
    // User first, then the challenge (read again after the user lock): never the reverse.
    if lock_challenge_owner(&mut *transaction, token_hash)
        .await?
        .is_none()
    {
        return Err(ApiError::from(AuthRejection::InvalidToken));
    }

    let user_id = lock_mfa_challenge(&mut *transaction, token_hash).await?;
    let user_id = user_id.ok_or(AuthRejection::InvalidToken)?;
    // Read under the lock, so a ban committed meanwhile is seen (and refused) here.
    let user = find_user_by_id(&mut *transaction, user_id).await?;
    let user = user.ok_or(AuthRejection::InvalidToken)?;

    Ok(user)
}
