use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::database::schema::schema_introspection::{
    IntrospectionError, introspect_public_schema,
};
use crate::modules::database::schema::schema_model::SchemaModel;

/// Bounds memory: one description per active project (old versions age out).
const MAX_CACHED_SCHEMAS: u64 = 2_000;
const SCHEMA_TIME_TO_IDLE: Duration = Duration::from_secs(30 * 60);

/// Each project's schema description, keyed by the version its database reports.
///
/// Any DDL bumps the version, so the next request reads the catalog again. Concurrent misses of one
/// version share a single read.
pub struct SchemaCache {
    schemas: Cache<(Uuid, i64), Arc<SchemaModel>>,
}

impl SchemaCache {
    pub fn new() -> Self {
        let schemas = Cache::builder()
            .max_capacity(MAX_CACHED_SCHEMAS)
            .time_to_idle(SCHEMA_TIME_TO_IDLE)
            .build();

        Self { schemas }
    }

    pub async fn schema(
        &self,
        tenant_id: Uuid,
        version: i64,
        connection: &mut PgConnection,
    ) -> Result<Arc<SchemaModel>, Arc<IntrospectionError>> {
        let load = async move { introspect_public_schema(connection).await.map(Arc::new) };

        self.schemas.try_get_with((tenant_id, version), load).await
    }
}

impl Default for SchemaCache {
    fn default() -> Self {
        Self::new()
    }
}
