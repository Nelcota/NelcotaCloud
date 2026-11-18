use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::email_template_repository::{TemplateKey, find_email_template};
use crate::modules::auth::email::email_template_text::{EmailTemplateText, default_template_text};

/// What one email says now, and whether the project wrote it.
#[derive(Debug, Serialize, ToSchema)]
pub struct EmailTemplateView {
    pub kind: AuthEmailKind,
    /// `false` while the platform's default wording is used.
    pub is_customized: bool,
    pub text: EmailTemplateText,
    /// The platform's wording, to compare with or go back to.
    pub default_text: EmailTemplateText,
}

pub const EMAIL_KINDS: [AuthEmailKind; 3] = [
    AuthEmailKind::Verification,
    AuthEmailKind::PasswordReset,
    AuthEmailKind::MagicLink,
];

pub async fn email_template_view(
    pool: &PgPool,
    key: TemplateKey,
) -> Result<EmailTemplateView, sqlx::Error> {
    let custom = find_email_template(pool, key).await?;
    let default_text = default_template_text(key.kind);
    let is_customized = custom.is_some();
    let text = custom.unwrap_or_else(|| default_text.clone());

    Ok(EmailTemplateView {
        kind: key.kind,
        is_customized,
        text,
        default_text,
    })
}

pub async fn email_template_views(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<EmailTemplateView>, sqlx::Error> {
    let mut views = Vec::with_capacity(EMAIL_KINDS.len());

    for kind in EMAIL_KINDS {
        views.push(email_template_view(pool, TemplateKey { tenant_id, kind }).await?);
    }

    Ok(views)
}

/// The text an email is sent with: the project's own, or the default.
pub async fn effective_template_text(
    pool: &PgPool,
    key: TemplateKey,
) -> Result<EmailTemplateText, sqlx::Error> {
    let custom = find_email_template(pool, key).await?;

    Ok(custom.unwrap_or_else(|| default_template_text(key.kind)))
}
