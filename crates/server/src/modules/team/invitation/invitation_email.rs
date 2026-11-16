use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email::AuthEmailContent;
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::tenants::platform::platform_tenant::find_platform_tenant_id;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::email::email_sender::send_in_background;
use crate::shared::http::api_error::ApiError;

/// Who is invited where, by whom.
pub struct InvitationNotice<'a> {
    pub project_id: Uuid,
    pub recipient: &'a str,
    pub inviter_email: &'a str,
}

/// Tells the invited person, in the background, to open the console and accept. The email
/// goes through the platform's own sender and links to the console (the platform tenant's site).
pub async fn send_invitation_email(
    state: &AppState,
    notice: InvitationNotice<'_>,
) -> Result<(), ApiError> {
    let platform_tenant_id = find_platform_tenant_id(state).await?;
    let console = load_tenant_settings(state, platform_tenant_id).await?;
    let project = load_tenant_settings(state, notice.project_id).await?;
    let content = invitation_content(InvitationWords {
        platform_name: &console.name,
        project_name: &project.name,
        inviter_email: notice.inviter_email,
        console_url: console.site_url.as_str(),
    });
    let email = render_auth_email(content, notice.recipient).map_err(ApiError::internal)?;
    let sender = state
        .email_senders
        .sender_for(platform_tenant_id)
        .await
        .map_err(ApiError::internal)?;
    send_in_background(sender, email);

    Ok(())
}

#[derive(Clone, Copy)]
struct InvitationWords<'a> {
    platform_name: &'a str,
    project_name: &'a str,
    inviter_email: &'a str,
    console_url: &'a str,
}

fn invitation_content(words: InvitationWords) -> AuthEmailContent {
    let project_name = words.project_name;

    AuthEmailContent {
        tenant_name: words.platform_name.to_owned(),
        subject: format!("You are invited to {project_name}"),
        heading: format!("Join {project_name}"),
        message: format!(
            "{inviter} invited you to manage the project {project_name}. Sign in to the console with this email address, or create an account with it, to accept.",
            inviter = words.inviter_email,
        ),
        action_label: "Open the console",
        link: words.console_url.to_owned(),
        expiry_note: "The invitation stays open until you accept or decline it.",
        ignore_note: "If you do not know this project, ignore this email.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_the_project_and_who_invited() {
        let content = invitation_content(InvitationWords {
            platform_name: "NelcotaCloud",
            project_name: "Loja",
            inviter_email: "ana@example.com",
            console_url: "https://console.example.com",
        });

        assert_eq!(content.subject, "You are invited to Loja");
        assert!(content.message.contains("ana@example.com"));
        assert_eq!(content.link, "https://console.example.com");
    }
}
