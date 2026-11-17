use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::audit::audit_action::AuditAction;
use crate::modules::auth::audit::audit_event::NewAuditEvent;
use crate::modules::auth::audit::audit_recorder::record_audit_event;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::user::user_account_updates::set_password;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct ResetPasswordBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// `POST /reset-password`: consuming the link, setting the password and ending every session
/// happen in one transaction, so a failure leaves the link usable and nothing half done.
#[utoipa::path(
    post,
    path = "/auth/v1/reset-password",
    tag = "auth",
    security(("api_key" = [])),
    request_body = ResetPasswordBody,
    responses(
        (status = 204, description = "Password changed and every session ended"),
        (status = 400, description = "Invalid or expired token, or weak password", body = ErrorBody),
    )
)]
pub async fn reset_password(
    State(state): State<AppState>,
    tenant: TenantContext,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<ResetPasswordBody>,
) -> Result<StatusCode, ApiError> {
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    let purpose = OneTimeTokenPurpose::PasswordReset;
    let consumed = consume_one_time_token(&mut transaction, purpose, &body.token).await?;
    let Some(consumed) = consumed else {
        return Err(ApiError::from(AuthRejection::InvalidToken));
    };
    let user_id = consumed.user_id;
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    set_password(&mut transaction, user_id, &password_hash).await?;
    end_all_user_sessions(&mut transaction, user_id).await?;
    // The reset link also verifies the email, so the user may have changed for receivers.
    let change = UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id,
    };
    record_user_change(&mut transaction, &webhooks, change).await?;
    transaction.commit().await?;
    let event = NewAuditEvent::by_user(AuditAction::PasswordReset, user_id, client_ip);
    record_audit_event(&tenant.pool, event).await;

    Ok(StatusCode::NO_CONTENT)
}
