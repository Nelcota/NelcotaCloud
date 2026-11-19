use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, SessionRequest, TokenSigning};
use crate::modules::auth::user::user_locks::lock_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::verified_inbox_claim::claim_verified_inbox;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::shared::http::api_error::ApiError;

/// Trades the token from an emailed magic link for a session.
///
/// Opening the link proves control of the inbox, so an account nobody verified is claimed for
/// whoever opened it.
pub async fn redeem_magic_link(
    (signing, webhooks): (&TokenSigning<'_>, &WebhookRecorder),
    tenant: &TenantContext,
    token: &str,
) -> Result<LoginResponse, ApiError> {
    let user = claim_magic_link(tenant, token, webhooks).await?;
    // A new connection, after the claim committed: the session starts after its invalidation.
    let mut connection = tenant.pool.acquire().await?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    complete_login(signing, request).await
}

async fn claim_magic_link(
    tenant: &TenantContext,
    token: &str,
    webhooks: &WebhookRecorder,
) -> Result<User, ApiError> {
    let mut transaction = tenant.pool.begin().await?;
    let purpose = OneTimeTokenPurpose::MagicLink;
    let consumed = consume_one_time_token(&mut transaction, purpose, token).await?;
    let consumed = consumed.ok_or(AuthRejection::InvalidToken)?;
    let user = verify_inbox_owner(&mut transaction, consumed.user_id, webhooks).await?;
    transaction.commit().await?;

    Ok(user)
}

async fn verify_inbox_owner(
    transaction: &mut PgConnection,
    user_id: Uuid,
    webhooks: &WebhookRecorder,
) -> Result<User, ApiError> {
    let user = lock_user_by_id(&mut *transaction, user_id).await?;
    let user = user.ok_or(AuthRejection::InvalidToken)?;

    Ok(claim_verified_inbox(transaction, user, webhooks).await?)
}
