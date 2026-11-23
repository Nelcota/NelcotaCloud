use std::sync::Arc;
use std::time::Duration;

use serde_json::json;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::team_notifications::{AuthEmailContent, render_auth_email};
use crate::modules::notifications::channel::channel_destinations::Destination;
use crate::modules::notifications::channel::channel_target::ChannelKind;
use crate::modules::notifications::delivery::alert_message::{
    AlertMessage, discord_text, slack_text,
};
use crate::modules::tenants::smtp::tenant_email_senders::TenantSmtpError;
use crate::shared::email::email_sender::EmailError;

/// A chat service that does not answer in this time counts as a failed delivery.
const CHAT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, thiserror::Error)]
pub enum DeliveryError {
    #[error("the chat service could not be reached: {0}")]
    Unreachable(#[from] reqwest::Error),
    #[error("the chat service answered {0}")]
    Refused(u16),
    #[error("could not render the alert email: {0}")]
    Render(#[from] askama::Error),
    #[error("no email sender for the platform: {0}")]
    Sender(#[from] Arc<TenantSmtpError>),
    #[error("could not send the alert email: {0}")]
    Email(#[from] EmailError),
}

/// The platform sends alerts in its own name, with the console's name on emails.
pub struct Sender<'a> {
    pub state: &'a AppState,
    pub platform_tenant_id: Uuid,
    pub platform_name: &'a str,
}

/// Sends one alert to one channel.
pub async fn deliver(
    sender: &Sender<'_>,
    destination: &Destination,
    alert: &AlertMessage,
) -> Result<(), DeliveryError> {
    match destination.kind {
        ChannelKind::Email => send_email(sender, &destination.address, alert).await,
        ChannelKind::Discord => {
            let body = json!({ "content": discord_text(alert) });
            post_chat(sender.state, &destination.address, body).await
        }
        ChannelKind::Slack => {
            let body = json!({ "text": slack_text(alert) });
            post_chat(sender.state, &destination.address, body).await
        }
    }
}

/// The address passed the channel's allow list when it was saved; redirects are never
/// followed (`http_client`), so the request cannot be bounced elsewhere.
async fn post_chat(
    state: &AppState,
    address: &str,
    body: serde_json::Value,
) -> Result<(), DeliveryError> {
    let response = state
        .http_client
        .post(address)
        .timeout(CHAT_TIMEOUT)
        .json(&body)
        .send()
        .await?;
    let status = response.status();

    if status.is_success() == false {
        return Err(DeliveryError::Refused(status.as_u16()));
    }

    Ok(())
}

async fn send_email(
    sender: &Sender<'_>,
    address: &str,
    alert: &AlertMessage,
) -> Result<(), DeliveryError> {
    let content = AuthEmailContent {
        tenant_name: sender.platform_name.to_owned(),
        subject: alert.subject.clone(),
        heading: alert.heading.clone(),
        message: alert.message.clone(),
        action_label: alert.action_label.clone(),
        link: alert.link.clone(),
        note: "Você recebe este aviso porque este endereço é um canal de notificação do projeto."
            .to_owned(),
    };
    let email = render_auth_email(content, address)?;
    let smtp = sender
        .state
        .email_senders
        .sender_for(sender.platform_tenant_id)
        .await?;
    smtp.send(email).await?;

    Ok(())
}
