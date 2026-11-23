use axum::Json;
use axum::extract::State;
use serde::Serialize;
use utoipa::ToSchema;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::modules::database::types::type_catalog_query::read_type_catalog;
use crate::modules::database::types::typescript_writer::write_typescript;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct DatabaseTypes {
    /// The `Database` type of the `public` schema, for `createClient<Database>()` of the SDK.
    pub typescript: String,
}

/// `GET /database/v1/types`: TypeScript types of the project's tables, views, functions and
/// enums, generated from the schema as it is now.
#[utoipa::path(
    get,
    path = "/database/v1/types",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The generated types", body = DatabaseTypes),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_types(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<DatabaseTypes>, ApiError> {
    let mut session = DeveloperSession::open(&state.database_sessions(), admin.tenant_id).await?;
    let catalog = read_type_catalog(&mut session.transaction)
        .await
        .map_err(ApiError::internal)?;
    session.commit().await?;

    Ok(Json(DatabaseTypes {
        typescript: write_typescript(&catalog),
    }))
}
