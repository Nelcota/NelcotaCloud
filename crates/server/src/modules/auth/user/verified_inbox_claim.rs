use sqlx::PgConnection;

use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::user_account_updates::claim_account_for_verified_email;
use crate::modules::auth::user::user_events::{UserChange, UserEventError, record_user_change};
use crate::modules::auth::user::user_record::User;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;

/// Hands an account to whoever just proved they own its inbox (magic link, OAuth provider).
///
/// On an account nobody verified, whoever set it up may not own the email: their password,
/// their sessions and their authenticator all go, so nothing they left behind can lock the
/// real owner out or keep them signed in. A verified account is returned unchanged.
pub async fn claim_verified_inbox(
    transaction: &mut PgConnection,
    user: User,
    webhooks: &WebhookRecorder,
) -> Result<User, UserEventError> {
    if user.email_verified_at.is_some() {
        return Ok(user);
    }

    let claimed = claim_account_for_verified_email(transaction, user.id).await?;
    end_all_user_sessions(transaction, user.id).await?;
    delete_mfa_factor(&mut *transaction, user.id).await?;
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id: user.id,
    };
    record_user_change(transaction, webhooks, change).await?;

    Ok(claimed)
}
