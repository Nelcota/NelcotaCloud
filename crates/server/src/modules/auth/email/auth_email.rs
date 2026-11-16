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
    pub action_label: &'static str,
    pub link: String,
    pub expiry_note: &'static str,
    pub ignore_note: &'static str,
}

pub fn verification_email(context: &AuthEmailContext, token: &str) -> AuthEmailContent {
    let tenant_name = context.tenant_name;

    AuthEmailContent {
        tenant_name: tenant_name.to_owned(),
        subject: format!("Confirm your email for {tenant_name}"),
        heading: "Confirm your email".to_owned(),
        message: format!(
            "Confirm your email address to finish setting up your {tenant_name} account."
        ),
        action_label: "Confirm email",
        link: context.site_url.link_with_token(VERIFY_EMAIL_PATH, token),
        expiry_note: "The link expires in 24 hours.",
        ignore_note: "If you did not create an account, ignore this email.",
    }
}

pub fn password_reset_email(context: &AuthEmailContext, token: &str) -> AuthEmailContent {
    let tenant_name = context.tenant_name;

    AuthEmailContent {
        tenant_name: tenant_name.to_owned(),
        subject: format!("Reset your {tenant_name} password"),
        heading: "Reset your password".to_owned(),
        message: format!("Someone asked to reset the password of your {tenant_name} account."),
        action_label: "Choose a new password",
        link: context.site_url.link_with_token(RESET_PASSWORD_PATH, token),
        expiry_note: "The link expires in 1 hour.",
        ignore_note: "If it was not you, ignore this email; your password stays the same.",
    }
}

pub fn magic_link_email(context: &AuthEmailContext, token: &str) -> AuthEmailContent {
    let tenant_name = context.tenant_name;

    AuthEmailContent {
        tenant_name: tenant_name.to_owned(),
        subject: format!("Your {tenant_name} login link"),
        heading: format!("Log in to {tenant_name}"),
        message: "Open this link to log in. No password needed.".to_owned(),
        action_label: "Log in",
        link: context.site_url.link_with_token(MAGIC_LINK_PATH, token),
        expiry_note: "The link expires in 15 minutes and works once.",
        ignore_note: "If you did not ask to log in, ignore this email.",
    }
}
