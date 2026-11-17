use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::email_template_text::EmailTemplateText;
use crate::modules::tenants::settings::site_url::SiteUrl;

const VERIFY_EMAIL_PATH: &str = "auth/verify-email";
const RESET_PASSWORD_PATH: &str = "auth/reset-password";
const MAGIC_LINK_PATH: &str = "auth/magic-link";

/// Which tenant app the email speaks for and which page its link opens.
pub struct AuthEmailContext<'a> {
    pub tenant_name: &'a str,
    pub site_url: &'a SiteUrl,
}

/// The words of an auth email, rendered into both its HTML and plain-text versions.
pub struct AuthEmailContent {
    pub tenant_name: String,
    pub subject: String,
    pub heading: String,
    pub message: String,
    pub action_label: String,
    pub link: String,
    /// Smaller text under the button; may span several lines or be empty.
    pub note: String,
}

/// An email whose button opens a one-time link on the tenant's site, worded by `text` (the
/// project's own or the default, `{app_name}` not filled yet).
pub fn auth_link_email(
    context: &AuthEmailContext,
    text: &EmailTemplateText,
    (kind, token): (AuthEmailKind, &str),
) -> AuthEmailContent {
    let filled = text.for_app(context.tenant_name);

    AuthEmailContent {
        tenant_name: context.tenant_name.to_owned(),
        subject: filled.subject,
        heading: filled.heading,
        message: filled.message,
        action_label: filled.action_label,
        link: context.site_url.link_with_token(link_path(kind), token),
        note: filled.note,
    }
}

fn link_path(kind: AuthEmailKind) -> &'static str {
    match kind {
        AuthEmailKind::Verification => VERIFY_EMAIL_PATH,
        AuthEmailKind::PasswordReset => RESET_PASSWORD_PATH,
        AuthEmailKind::MagicLink => MAGIC_LINK_PATH,
    }
}

/// Sent on request from the console to check that the tenant's own SMTP server delivers.
pub fn smtp_test_email(context: &AuthEmailContext) -> AuthEmailContent {
    let tenant_name = context.tenant_name;

    AuthEmailContent {
        tenant_name: tenant_name.to_owned(),
        subject: format!("Test email from {tenant_name}"),
        heading: "Your SMTP server works".to_owned(),
        message: format!(
            "This test was sent through the SMTP server configured for {tenant_name}. Auth emails will reach your users the same way."
        ),
        action_label: "Open your app".to_owned(),
        link: context.site_url.as_str().to_owned(),
        note: "Nothing to do: this email only confirms the delivery.\nIf you did not ask for a test, someone with access to the project did.".to_owned(),
    }
}
