use sqlx::PgPool;
use uuid::Uuid;

/// Where to tell a project's owners about something only they can fix. Addresses come from
/// the memberships, refreshed whenever the account lists its projects.
pub async fn project_owner_emails(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT account_email FROM tenant_members \
         WHERE tenant_id = $1 AND role = 'owner' AND account_email <> '' ORDER BY account_id",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}
