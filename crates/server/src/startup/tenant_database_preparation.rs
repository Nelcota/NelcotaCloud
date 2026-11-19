use futures_util::stream::{self, StreamExt, TryStreamExt};
use sqlx::PgPool;

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
            Some(last) => last.clone(),
            None => return Ok(()),
        };

        stream::iter(slugs)
            .map(|slug| prepare_tenant(server, slug))
            .buffer_unordered(PARALLEL_MIGRATIONS)
            .try_for_each(|()| std::future::ready(Ok(())))
            .await?;
        after = last;
    }
}

async fn prepare_tenant(
    server: &TenantDatabaseServer<'_>,
    slug: String,
) -> Result<(), StartupError> {
    let tenant_slug = TenantSlug::parse(&slug)?;
    server
        .migrate_database(&tenant_slug)
        .await
        .map_err(|source| StartupError::TenantMigration { slug, source })
}
