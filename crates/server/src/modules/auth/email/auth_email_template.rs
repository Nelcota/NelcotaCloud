use askama::Template;

use crate::modules::auth::email::auth_email::AuthEmailContent;
use crate::shared::email::outgoing_email::OutgoingEmail;

/// HTML version; askama escapes every value, so a tenant name cannot inject markup.
#[derive(Template)]
#[template(path = "auth_email.html")]
struct AuthEmailHtml<'a> {
    content: &'a AuthEmailContent,
}

pub fn render_auth_email(
    content: AuthEmailContent,
    recipient: &str,
) -> Result<OutgoingEmail, askama::Error> {
    let html_body = AuthEmailHtml { content: &content }.render()?;
    let text_body = format!(
        "{heading}\n\n{message}\n\n{action_label}: {link}\n\n{note}\n",
        heading = content.heading,
        message = content.message,
        action_label = content.action_label,
        link = content.link,
        note = content.note,
    );

    Ok(OutgoingEmail {
        to: recipient.to_owned(),
        subject: content.subject,
        text_body,
        html_body,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn content_named(tenant_name: &str) -> AuthEmailContent {
        AuthEmailContent {
            tenant_name: tenant_name.to_owned(),
            subject: "Subject".to_owned(),
            heading: "Heading".to_owned(),
            message: "Message".to_owned(),
            action_label: "Act".to_owned(),
            link: "https://app.test/auth#token=abc".to_owned(),
            note: "Expires".to_owned(),
        }
    }

    #[test]
    fn escapes_tenant_controlled_values_in_html() -> Result<(), askama::Error> {
        let email = render_auth_email(content_named("<script>x</script>"), "ana@example.com")?;

        assert!(
            email.html_body.contains("&#60;script&#62;")
                || email.html_body.contains("&lt;script&gt;")
        );
        assert!(email.html_body.contains("<script>") == false);
        Ok(())
    }

    #[test]
    fn plain_text_carries_the_link() -> Result<(), askama::Error> {
        let email = render_auth_email(content_named("Acme"), "ana@example.com")?;

        assert!(email.text_body.contains("https://app.test/auth#token=abc"));
        Ok(())
    }
}
