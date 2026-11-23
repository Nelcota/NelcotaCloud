use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::channel::channel_destinations::{
    Destination, destinations_for, find_destination,
};
use crate::modules::notifications::channel::notification_event::NotificationEvent;
use crate::modules::notifications::delivery::alert_message::AlertMessage;
use crate::modules::notifications::delivery::channel_delivery::{DeliveryError, Sender, deliver};
use crate::modules::tenants::settings::loaded_tenant_settings::{
    LoadedTenantSettings, load_tenant_settings,
};
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::http::api_error::ApiError;

/// An alert before it has a link: `path` is the console page, relative to the console's URL.
pub struct AlertDraft {
    pub subject: String,
    pub heading: String,
    pub message: String,
    pub action_label: String,
    pub path: String,
}

#[derive(Debug, thiserror::Error)]
pub enum DispatchError {
    #[error("database error while sending an alert: {0}")]
    Database(#[from] sqlx::Error),
    #[error("could not read the console settings: {0}")]
    Settings(#[from] ApiError),
    #[error("there is no console (platform tenant) to link alerts to")]
    NoConsole,
    #[error("no such notification channel")]
    NoChannel,
    #[error(transparent)]
    Delivery(#[from] DeliveryError),
}

/// Sends the alert to every channel of the project that receives `event`; answers how many
/// got it. A channel that fails is logged and the others still receive it.
pub async fn dispatch_alert(
    state: &AppState,
    (tenant_id, event): (Uuid, NotificationEvent),
    draft: &AlertDraft,
) -> Result<usize, DispatchError> {
    let keys = (&state.control_plane_pool, state.secret_box.as_ref());
    let destinations = destinations_for(keys, tenant_id, event).await?;

    if destinations.is_empty() {
        return Ok(0);
    }

    let (platform_tenant_id, console) = console_of(state).await?;
    let sender = Sender {
        state,
        platform_tenant_id,
        platform_name: &console.name,
    };
    let alert = finished(draft, &console.site_url);
    let mut delivered = 0_usize;

    for destination in &destinations {
        if send_logged(&sender, destination, &alert).await {
            delivered = delivered.saturating_add(1);
        }
    }

    Ok(delivered)
}

/// Sends the alert to one channel and reports the failure, for the console's "Enviar teste".
pub async fn send_to_channel(
    state: &AppState,
    (tenant_id, channel_id): (Uuid, Uuid),
    draft: &AlertDraft,
) -> Result<(), DispatchError> {
    let keys = (&state.control_plane_pool, state.secret_box.as_ref());
    let destination = find_destination(keys, tenant_id, channel_id)
        .await?
        .ok_or(DispatchError::NoChannel)?;
    let (platform_tenant_id, console) = console_of(state).await?;
    let sender = Sender {
        state,
        platform_tenant_id,
        platform_name: &console.name,
    };
    deliver(&sender, &destination, &finished(draft, &console.site_url)).await?;

    Ok(())
}

async fn send_logged(sender: &Sender<'_>, destination: &Destination, alert: &AlertMessage) -> bool {
    let channel_id = destination.channel_id;

    match deliver(sender, destination, alert).await {
        Ok(()) => true,
        Err(error) => {
            tracing::warn!(%channel_id, %error, "could not deliver an alert");
            false
        }
    }
}

/// The console: its name signs the emails and its site URL roots the links.
async fn console_of(state: &AppState) -> Result<(Uuid, LoadedTenantSettings), DispatchError> {
    let platform_tenant_id = state
        .platform_tenant
        .find_optional_id()
        .await?
        .ok_or(DispatchError::NoConsole)?;
    let console = load_tenant_settings(&state.control_plane_pool, platform_tenant_id).await?;

    Ok((platform_tenant_id, console))
}

fn finished(draft: &AlertDraft, console_url: &SiteUrl) -> AlertMessage {
    AlertMessage {
        subject: draft.subject.clone(),
        heading: draft.heading.clone(),
        message: draft.message.clone(),
        action_label: draft.action_label.clone(),
        link: console_url.link_with_query(&draft.path, &[]),
    }
}
