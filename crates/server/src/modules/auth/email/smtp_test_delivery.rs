use std::sync::Arc;

use uuid::Uuid;

use crate::modules::auth::email::auth_email::{AuthEmailContext, smtp_test_email};
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::routes::configure_smtp::SmtpSettingsBody;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_senders::TenantSmtpError;
use crate::shared::email::email_sender::EmailSender;
use crate::shared::http::api_error::ApiError;

/// One test email: to whom, and through which server.
pub struct SmtpTest<'a> {
    pub tenant_id: Uuid,
    pub recipient: &'a EmailAddress,
    /// Settings not saved yet, tried before they take effect; `None` tests the stored server.
    pub server: Option<&'a SmtpSettingsBody>,
}

/// Sends a test email through the tenant's SMTP server and waits for it to accept the
/// message, so the owner sees a delivery problem right away.
pub async fn deliver_smtp_test(mailer: &AuthMailer, test: &SmtpTest<'_>) -> Result<(), ApiError> {
    let settings = load_tenant_settings(&mailer.control_plane_pool, test.tenant_id).await?;
    let context = AuthEmailContext {
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let email = render_auth_email(smtp_test_email(&context), test.recipient.as_str())
        .map_err(ApiError::internal)?;
    let sender = test_sender(mailer, test).await?;

    if let Err(error) = sender.send(email).await {
        tracing::warn!(%error, "SMTP test email was not delivered");
        return Err(ApiError::from(TenantsRejection::SmtpDeliveryFailed));
    }

    Ok(())
}

async fn test_sender(
    mailer: &AuthMailer,
    test: &SmtpTest<'_>,
) -> Result<Arc<EmailSender>, ApiError> {
    let senders = &mailer.email_senders;
    let Some(server) = test.server else {
        return senders
            .custom_sender_for(test.tenant_id)
            .await
            .map_err(|error| map_stored_sender_error(&error))?
            .ok_or_else(|| {
                ApiError::Conflict(
                    "configure your own SMTP server before sending a test".to_owned(),
                )
            });
    };
    let sender = senders
        .unsaved_sender(server.smtp_url.trim(), server.email_from.trim())
        .await
        .map_err(map_unsaved_sender_error)?;

    Ok(Arc::new(sender))
}

/// A server that accepts no connection is a delivery failure the admin can fix, not ours.
fn map_stored_sender_error(error: &TenantSmtpError) -> ApiError {
    if let TenantSmtpError::Unreachable(unreachable) = error {
        tracing::warn!(%unreachable, "SMTP test email was not delivered");
        return ApiError::from(TenantsRejection::SmtpDeliveryFailed);
    }

    ApiError::internal(error)
}

/// Unsaved settings fail like a save would: a bad URL, host or sender is the owner's to fix.
fn map_unsaved_sender_error(error: TenantSmtpError) -> ApiError {
    match error {
        TenantSmtpError::Unreachable(unreachable) => {
            tracing::warn!(%unreachable, "SMTP test email was not delivered");
            ApiError::from(TenantsRejection::SmtpDeliveryFailed)
        }
        TenantSmtpError::Endpoint(_)
        | TenantSmtpError::HostPolicy(_)
        | TenantSmtpError::PinnedSender(_)
        | TenantSmtpError::Email(_) => ApiError::invalid_request(error),
        other => ApiError::internal(other),
    }
}
