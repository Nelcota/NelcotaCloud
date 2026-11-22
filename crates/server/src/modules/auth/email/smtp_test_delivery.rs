use uuid::Uuid;

use crate::modules::auth::email::auth_email::{AuthEmailContext, smtp_test_email};
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_senders::TenantSmtpError;
use crate::shared::http::api_error::ApiError;

/// Sends a test email through the tenant's SMTP server and waits for it to accept the
/// message, so the owner sees a delivery problem right away.
pub async fn deliver_smtp_test(
    mailer: &AuthMailer,
    tenant_id: Uuid,
    recipient: &EmailAddress,
) -> Result<(), ApiError> {
    let settings = load_tenant_settings(&mailer.control_plane_pool, tenant_id).await?;
    let context = AuthEmailContext {
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let email = render_auth_email(smtp_test_email(&context), recipient.as_str())
        .map_err(ApiError::internal)?;
    let sender = mailer
        .email_senders
        .custom_sender_for(tenant_id)
        .await
        .map_err(|error| map_sender_error(&error))?
        .ok_or_else(|| {
            ApiError::Conflict("configure your own SMTP server before sending a test".to_owned())
        })?;

    if let Err(error) = sender.send(email).await {
        tracing::warn!(%error, "SMTP test email was not delivered");
        return Err(ApiError::from(TenantsRejection::SmtpDeliveryFailed));
    }

    Ok(())
}

/// A server that accepts no connection is a delivery failure the admin can fix, not ours.
fn map_sender_error(error: &TenantSmtpError) -> ApiError {
    if let TenantSmtpError::Unreachable(unreachable) = error {
        tracing::warn!(%unreachable, "SMTP test email was not delivered");
        return ApiError::from(TenantsRejection::SmtpDeliveryFailed);
    }

    ApiError::internal(error)
}
