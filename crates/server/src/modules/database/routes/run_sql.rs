use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::modules::database::admin::developer_sql::sql_run::{SqlResult, run_script};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Debug, Deserialize, ToSchema, Validate)]
pub struct RunSqlRequest {
    /// One or more statements, run in one transaction.
    #[validate(length(min = 1, max = 100000))]
    pub query: String,
}

/// `POST /database/v1/sql`: runs SQL on the project's database as its developer role.
///
/// The developer role owns `public` and is never a superuser; scripts get 15 seconds. Answers the last result set, up to
/// 1000 rows, with values as Postgres prints them.
#[utoipa::path(
    post,
    path = "/database/v1/sql",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = RunSqlRequest,
    responses(
        (status = 200, description = "The result", body = SqlResult),
        (status = 400, description = "Refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 504, description = "Took longer than 15 seconds", body = ErrorBody),
    )
)]
pub async fn run_sql(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(request): ValidatedJson<RunSqlRequest>,
) -> Result<Json<SqlResult>, ApiError> {
    let mut session = DeveloperSession::open(&state, admin.tenant_id).await?;
    let result = run_script(&mut session, request.query).await?;
    session.commit().await?;

    Ok(Json(result))
}
