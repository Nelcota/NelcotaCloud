use crate::control_plane::site_url::SiteUrl;
use crate::email::email_sender::OutgoingEmail;

const VERIFY_EMAIL_PATH: &str = "auth/verify-email";
const RESET_PASSWORD_PATH: &str = "auth/reset-password";

/// Who the email is for and which tenant app the link opens.
pub struct AuthEmailContext<'a> {
    pub recipient: &'a str,
    pub tenant_name: &'a str,
    pub site_url: &'a SiteUrl,
}

pub fn verification_email(context: &AuthEmailContext, token: &str) -> OutgoingEmail {
    let link = context.site_url.link_with_token(VERIFY_EMAIL_PATH, token);
    let tenant_name = context.tenant_name;

    OutgoingEmail {
        to: context.recipient.to_owned(),
        subject: format!("Confirm your email for {tenant_name}"),
        body: format!(
            "Confirm your email address for {tenant_name} by opening this link:\n\n{link}\n\nThe link expires in 24 hours. If you did not create an account, ignore this email.\n"
        ),
    }
}

pub fn password_reset_email(context: &AuthEmailContext, token: &str) -> OutgoingEmail {
    let link = context.site_url.link_with_token(RESET_PASSWORD_PATH, token);
    let tenant_name = context.tenant_name;

    OutgoingEmail {
        to: context.recipient.to_owned(),
        subject: format!("Reset your {tenant_name} password"),
        body: format!(
            "Someone asked to reset the password of your {tenant_name} account.\n\nOpen this link to choose a new password:\n\n{link}\n\nThe link expires in 1 hour. If it was not you, ignore this email.\n"
        ),
    }
}
