use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::email_template_text::EmailTemplateText;

/// One email of one project.
#[derive(Debug, Clone, Copy)]
pub struct TemplateKey {
    pub tenant_id: Uuid,
    pub kind: AuthEmailKind,
}

pub async fn find_email_template(
    pool: &PgPool,
    key: TemplateKey,
) -> Result<Option<EmailTemplateText>, sqlx::Error> {
    sqlx::query_as(
        "SELECT subject, heading, message, action_label, note FROM tenant_email_templates WHERE tenant_id = $1 AND kind = $2",
    )
    .bind(key.tenant_id)
    .bind(key.kind)
    .fetch_optional(pool)
    .await
}

pub async fn save_email_template(
    pool: &PgPool,
    key: TemplateKey,
    text: &EmailTemplateText,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_email_templates (tenant_id, kind, subject, heading, message, action_label, note) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, kind) DO UPDATE SET subject = EXCLUDED.subject, heading = EXCLUDED.heading, message = EXCLUDED.message, action_label = EXCLUDED.action_label, note = EXCLUDED.note, updated_at = now()",
    )
    .bind(key.tenant_id)
    .bind(key.kind)
    .bind(&text.subject)
    .bind(&text.heading)
    .bind(&text.message)
    .bind(&text.action_label)
    .bind(&text.note)
    .execute(pool)
    .await?;

    Ok(())
}

/// Goes back to the platform's wording.
pub async fn delete_email_template(pool: &PgPool, key: TemplateKey) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tenant_email_templates WHERE tenant_id = $1 AND kind = $2")
        .bind(key.tenant_id)
        .bind(key.kind)
        .execute(pool)
        .await?;

    Ok(())
}
