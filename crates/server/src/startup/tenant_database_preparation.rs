use futures_util::stream::{self, StreamExt, TryStreamExt};
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::postgres::tenant_database_server::TenantDatabaseServer;
use crate::modules::tenants::provisioning::tenant_repository::tenant_slugs_after;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::startup::startup_error::StartupError;

const PARALLEL_MIGRATIONS: usize = 4;
const PAGE_SIZE: i64 = 64;

pub(super) async fn prepare_existing_tenants(
    pool: &PgPool,
    server: &TenantDatabaseServer<'_>,
) -> Result<(), StartupError> {
    let mut after = String::new();

    loop {
        let slugs = tenant_slugs_after(pool, &after, PAGE_SIZE).await?;
        let last = match slugs.last() {
            Some((slug, _)) => slug.clone(),
            None => return Ok(()),
        };

        stream::iter(slugs)
            .map(|tenant| prepare_tenant(pool, server, tenant))
            .buffer_unordered(PARALLEL_MIGRATIONS)
            .try_for_each(|()| std::future::ready(Ok(())))
            .await?;
        after = last;
    }
}

async fn prepare_tenant(
    pool: &PgPool,
    server: &TenantDatabaseServer<'_>,
    (slug, id): (String, Uuid),
) -> Result<(), StartupError> {
    let tenant_slug = TenantSlug::parse(&slug)?;
    server
        .prepare_registered_database(pool, &tenant_slug, id)
        .await
        .map(|_| ())
        .map_err(|source| StartupError::TenantMigration { slug, source })
}
