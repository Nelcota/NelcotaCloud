use std::sync::Arc;

use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::team_notifications::{AuthEmailContent, render_auth_email};
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::tenant_email_delivery::send_tenant_email_in_background;
use crate::shared::http::api_error::ApiError;

/// The console login, opened for an invitation: it names the project and asks for the invited address.
const INVITATION_LOGIN_PATH: &str = "login";
const INVITATION_FLAG: (&str, &str) = ("convite", "1");
const PROJECT_PARAMETER: &str = "projeto";

/// Who is invited where, by whom.
pub struct InvitationNotice<'a> {
    pub project_id: Uuid,
    pub recipient: &'a str,
    pub inviter_email: &'a str,
}

/// Tells the invited person, in the background, to open the console and accept.
///
/// The email goes through the platform's own sender and links to the console login (the
/// platform tenant's site), opened for this invitation.
pub async fn send_invitation_email(
    state: &AppState,
    notice: InvitationNotice<'_>,
) -> Result<(), ApiError> {
    let platform_tenant_id = state.platform_tenant.find_id().await?;
    let console = load_tenant_settings(&state.control_plane_pool, platform_tenant_id).await?;
    let project = load_tenant_settings(&state.control_plane_pool, notice.project_id).await?;
    let login_link = console.site_url.link_with_query(
        INVITATION_LOGIN_PATH,
        &[INVITATION_FLAG, (PROJECT_PARAMETER, &project.name)],
    );
    let content = invitation_content(InvitationWords {
        platform_name: &console.name,
        project_name: &project.name,
        inviter_email: notice.inviter_email,
        login_link: &login_link,
    });
    let email = render_auth_email(content, notice.recipient).map_err(ApiError::internal)?;
    send_tenant_email_in_background(Arc::clone(&state.email_senders), platform_tenant_id, email);

    Ok(())
}

#[derive(Clone, Copy)]
struct InvitationWords<'a> {
    platform_name: &'a str,
    project_name: &'a str,
    inviter_email: &'a str,
    login_link: &'a str,
}

fn invitation_content(words: InvitationWords) -> AuthEmailContent {
    let project_name = words.project_name;

    AuthEmailContent {
        tenant_name: words.platform_name.to_owned(),
        subject: format!("Você foi convidado para o projeto {project_name}"),
        heading: format!("Entre no projeto {project_name}"),
        message: format!(
            "{inviter} convidou você para o projeto {project_name}. Entre ou crie sua conta com este mesmo email para aceitar.",
            inviter = words.inviter_email,
        ),
        action_label: "Aceitar convite".to_owned(),
        link: words.login_link.to_owned(),
        note: "O convite fica aberto até você aceitar ou recusar.\nSe você não conhece este projeto, ignore este email.".to_owned(),
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
            login_link: "https://console.example.com/login?convite=1",
        });

        assert_eq!(content.subject, "Você foi convidado para o projeto Loja");
        assert!(content.message.contains("ana@example.com"));
        assert!(content.message.contains("mesmo email"));
        assert_eq!(content.link, "https://console.example.com/login?convite=1");
    }
}
