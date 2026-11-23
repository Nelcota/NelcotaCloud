use std::sync::Arc;

use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::team_notifications::{AuthEmailContent, render_auth_email};
use crate::modules::notifications::alerts::alert_texts::webhook_text;
use crate::modules::notifications::channel::notification_event::NotificationEvent;
use crate::modules::notifications::delivery::alert_dispatch::dispatch_alert;
use crate::modules::team::notification::project_owner_emails::project_owner_emails;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_senders::TenantSmtpError;
use crate::modules::webhooks::health::failing_endpoints::FailingEndpoint;
use crate::shared::email::email_sender::EmailError;
use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
pub enum WebhookAlertError {
    #[error("database error while alerting about a webhook: {0}")]
    Database(#[from] sqlx::Error),
    #[error("could not read the project settings: {0}")]
    Settings(#[from] ApiError),
    #[error("could not render the webhook alert: {0}")]
    Render(#[from] askama::Error),
    #[error("no email sender for the platform: {0}")]
    Sender(#[from] Arc<TenantSmtpError>),
    #[error("could not send the webhook alert: {0}")]
    Email(#[from] EmailError),
}

/// What the owners are told.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookAlertKind {
    /// Refusing deliveries for hours; still enabled.
    Failing,
    /// Refused for days and paused by the platform.
    Paused,
}

/// Tells every owner of the endpoint's project, through the platform's own sender.
///
/// The button opens the endpoint's page in the console. The endpoint's URL and name, typed by
/// the owner, stay out of the email: the button is the only place it points to.
pub async fn send_webhook_alert(
    state: &AppState,
    platform_tenant_id: Uuid,
    (endpoint, kind): (&FailingEndpoint, WebhookAlertKind),
) -> Result<(), WebhookAlertError> {
    let pool = &state.control_plane_pool;
    notify_channels(state, endpoint, kind).await;
    let recipients = project_owner_emails(pool, endpoint.tenant_id).await?;

    if recipients.is_empty() {
        return Ok(());
    }

    let console = load_tenant_settings(pool, platform_tenant_id).await?;
    let project = load_tenant_settings(pool, endpoint.tenant_id).await?;
    let path = format!("projects/{}/webhooks/{}", endpoint.tenant_id, endpoint.id);
    let words = AlertWords {
        platform_name: &console.name,
        project_name: &project.name,
        link: &console.site_url.link_with_query(&path, &[]),
    };
    let sender = state.email_senders.sender_for(platform_tenant_id).await?;

    for recipient in &recipients {
        let email = render_auth_email(alert_content(kind, words), recipient)?;
        sender.send(email).await?;
    }

    Ok(())
}

/// The project's notification channels hear about it too; their failures only get logged, so
/// they never hold back the owners' email.
async fn notify_channels(state: &AppState, endpoint: &FailingEndpoint, kind: WebhookAlertKind) {
    let tenant_id = endpoint.tenant_id;
    let Ok(project) = load_tenant_settings(&state.control_plane_pool, tenant_id).await else {
        return;
    };
    let draft = webhook_text(
        (tenant_id, &project.name),
        endpoint.id,
        kind == WebhookAlertKind::Paused,
    );
    let target = (tenant_id, NotificationEvent::WebhookFailing);

    if let Err(error) = dispatch_alert(state, target, &draft).await {
        tracing::warn!(%tenant_id, %error, "could not send a webhook alert to the channels");
    }
}

#[derive(Clone, Copy)]
struct AlertWords<'a> {
    platform_name: &'a str,
    project_name: &'a str,
    link: &'a str,
}

fn alert_content(kind: WebhookAlertKind, words: AlertWords) -> AuthEmailContent {
    let project_name = words.project_name;
    let (subject, heading, message, action_label) = match kind {
        WebhookAlertKind::Failing => (
            format!("Um webhook do projeto {project_name} está falhando"),
            "Webhook falhando".to_owned(),
            format!(
                "Um endpoint de webhook do projeto {project_name} recusa as entregas há mais de 6 horas. Cada entrega é tentada de novo por cerca de 28 horas e depois se perde."
            ),
            "Ver o endpoint".to_owned(),
        ),
        WebhookAlertKind::Paused => (
            format!("Pausamos um webhook do projeto {project_name}"),
            "Webhook pausado".to_owned(),
            format!(
                "Um endpoint de webhook do projeto {project_name} recusou as entregas por 5 dias e foi pausado. Ele não recebe novos eventos até você reativá-lo."
            ),
            "Reativar o endpoint".to_owned(),
        ),
    };

    AuthEmailContent {
        tenant_name: words.platform_name.to_owned(),
        subject,
        heading,
        message,
        action_label,
        link: words.link.to_owned(),
        note: note_for(kind),
    }
}

fn note_for(kind: WebhookAlertKind) -> String {
    let reason = "Você recebe este aviso porque é dono do projeto.";

    match kind {
        WebhookAlertKind::Failing => {
            format!("Se ele continuar falhando por 5 dias, nós o pausamos.\n{reason}")
        }
        WebhookAlertKind::Paused => reason.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORDS: AlertWords = AlertWords {
        platform_name: "NelcotaCloud",
        project_name: "Loja",
        link: "https://console.example.com/projects/p/webhooks/e",
    };

    #[test]
    fn a_failing_alert_names_the_project_and_warns_about_the_pause() {
        let content = alert_content(WebhookAlertKind::Failing, WORDS);

        assert_eq!(content.subject, "Um webhook do projeto Loja está falhando");
        assert!(content.note.contains("5 dias"));
        assert_eq!(content.link, WORDS.link);
    }

    #[test]
    fn a_pause_alert_asks_to_turn_it_back_on() {
        let content = alert_content(WebhookAlertKind::Paused, WORDS);

        assert_eq!(content.subject, "Pausamos um webhook do projeto Loja");
        assert_eq!(content.action_label, "Reativar o endpoint");
    }
}
