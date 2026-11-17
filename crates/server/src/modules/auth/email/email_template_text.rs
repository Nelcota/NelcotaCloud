use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::{Validate, ValidationError};

use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;

/// Written in any field, replaced by the project's name when the email is sent.
pub const APP_NAME_PLACEHOLDER: &str = "{app_name}";

/// The words of one auth email, plain text only: the HTML layout escapes them, and the link,
/// its button and the address it goes to stay the platform's.
#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Validate, ToSchema, sqlx::FromRow,
)]
#[serde(deny_unknown_fields)]
pub struct EmailTemplateText {
    #[validate(length(min = 1, max = 150), custom(function = check_single_line))]
    pub subject: String,
    #[validate(length(min = 1, max = 150), custom(function = check_single_line))]
    pub heading: String,
    /// May span several lines.
    #[validate(length(min = 1, max = 1000), custom(function = check_not_blank))]
    pub message: String,
    #[validate(length(min = 1, max = 50), custom(function = check_single_line))]
    pub action_label: String,
    /// Shown under the button, smaller; may span several lines or be empty.
    #[validate(length(max = 500))]
    pub note: String,
}

impl EmailTemplateText {
    /// The text with `{app_name}` replaced in every field.
    pub fn for_app(&self, app_name: &str) -> Self {
        let fill = |text: &str| text.replace(APP_NAME_PLACEHOLDER, app_name);

        Self {
            subject: fill(&self.subject),
            heading: fill(&self.heading),
            message: fill(&self.message),
            action_label: fill(&self.action_label),
            note: fill(&self.note),
        }
    }
}

/// What each email says until the project writes its own.
pub fn default_template_text(kind: AuthEmailKind) -> EmailTemplateText {
    let (subject, heading, message, action_label, note) = match kind {
        AuthEmailKind::Verification => (
            "Confirm your email for {app_name}",
            "Confirm your email",
            "Confirm your email address to finish setting up your {app_name} account.",
            "Confirm email",
            "The link expires in 24 hours.\nIf you did not create an account, ignore this email.",
        ),
        AuthEmailKind::PasswordReset => (
            "Reset your {app_name} password",
            "Reset your password",
            "Someone asked to reset the password of your {app_name} account.",
            "Choose a new password",
            "The link expires in 1 hour.\nIf it was not you, ignore this email; your password stays the same.",
        ),
        AuthEmailKind::MagicLink => (
            "Your {app_name} login link",
            "Log in to {app_name}",
            "Open this link to log in. No password needed.",
            "Log in",
            "The link expires in 15 minutes and works once.\nIf you did not ask to log in, ignore this email.",
        ),
    };

    EmailTemplateText {
        subject: subject.to_owned(),
        heading: heading.to_owned(),
        message: message.to_owned(),
        action_label: action_label.to_owned(),
        note: note.to_owned(),
    }
}

/// Subjects become a mail header, so line breaks and other control characters are refused.
fn check_single_line(text: &str) -> Result<(), ValidationError> {
    check_not_blank(text)?;

    if text.chars().any(char::is_control) {
        return Err(ValidationError::new("single_line")
            .with_message("must be one line, without control characters".into()));
    }

    Ok(())
}

fn check_not_blank(text: &str) -> Result<(), ValidationError> {
    if text.trim().is_empty() {
        return Err(ValidationError::new("blank").with_message("must not be blank".into()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text_with_subject(subject: &str) -> EmailTemplateText {
        EmailTemplateText {
            subject: subject.to_owned(),
            ..default_template_text(AuthEmailKind::Verification)
        }
    }

    #[test]
    fn defaults_are_valid() {
        for kind in [
            AuthEmailKind::Verification,
            AuthEmailKind::PasswordReset,
            AuthEmailKind::MagicLink,
        ] {
            assert!(default_template_text(kind).validate().is_ok());
        }
    }

    #[test]
    fn refuses_line_breaks_and_blank_subjects() {
        assert!(
            text_with_subject("Hi\r\nBcc: x@example.com")
                .validate()
                .is_err()
        );
        assert!(text_with_subject("   ").validate().is_err());
        assert!(
            text_with_subject("Bem-vindo ao {app_name}")
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn replaces_the_app_name_everywhere() {
        let filled = default_template_text(AuthEmailKind::MagicLink).for_app("Acme");

        assert_eq!(filled.subject, "Your Acme login link");
        assert_eq!(filled.heading, "Log in to Acme");
    }
}
