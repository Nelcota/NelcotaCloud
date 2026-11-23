use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_repository::{lock_slug, slug_exists};
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;

#[derive(sqlx::FromRow)]
pub struct ProvisioningIntent {
    pub slug: String,
    pub tenant_id: Uuid,
}

impl ProvisioningIntent {
    /// Record the work before creating anything outside the control plane transaction.
    pub async fn reserve(pool: &PgPool, slug: &TenantSlug) -> Result<Self, ProvisioningError> {
        let mut transaction = pool.begin().await?;
        lock_slug(&mut transaction, slug).await?;

        if slug_exists(&mut *transaction, slug).await? {
            return Err(ProvisioningError::SlugTaken);
        }

        let intent = sqlx::query_as(
            "INSERT INTO tenant_provisioning_intents (slug, tenant_id) VALUES ($1, $2)
             ON CONFLICT (slug) DO NOTHING RETURNING slug, tenant_id",
        )
        .bind(slug.as_str())
        .bind(Uuid::new_v4())
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(ProvisioningError::SlugTaken)?;
        transaction.commit().await?;

        Ok(intent)
    }

    pub async fn exists(&self, connection: &mut PgConnection) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM tenant_provisioning_intents WHERE slug = $1 AND tenant_id = $2)",
        )
        .bind(&self.slug)
        .bind(self.tenant_id)
        .fetch_one(connection)
        .await
    }

    pub async fn complete(&self, connection: &mut PgConnection) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM tenant_provisioning_intents WHERE slug = $1 AND tenant_id = $2")
            .bind(&self.slug)
            .bind(self.tenant_id)
            .execute(connection)
            .await?;

        Ok(())
    }

    pub async fn due(pool: &PgPool) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as(
            "SELECT slug, tenant_id FROM tenant_provisioning_intents WHERE recover_after <= now()
             ORDER BY recover_after, slug LIMIT 16",
        )
        .fetch_all(pool)
        .await
    }

    pub async fn postpone(&self, pool: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE tenant_provisioning_intents SET recover_after = now() + interval '1 minute'
             WHERE slug = $1 AND tenant_id = $2",
        )
        .bind(&self.slug)
        .bind(self.tenant_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}
