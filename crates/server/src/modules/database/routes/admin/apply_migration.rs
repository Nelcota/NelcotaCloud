use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::migrations::apply_migration::{
    MigrationOutcome, apply_migration,
};
use crate::modules::database::admin::migrations::migration_record::MigrationRecord;
use crate::modules::database::admin::migrations::migration_request::MigrationRequest;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// Applies one versioned SQL file atomically, or returns its existing history entry on replay.
#[utoipa::path(
    post,
    path = "/database/v1/migrations",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = MigrationRequest,
    responses(
        (status = 200, description = "The same migration was already applied", body = MigrationRecord),
        (status = 201, description = "Migration applied", body = MigrationRecord),
        (status = 400, description = "Invalid request or SQL", body = ErrorBody),
        (status = 401, description = "Missing or invalid credentials", body = ErrorBody),
        (status = 403, description = "Requires a secret API key or project membership", body = ErrorBody),
        (status = 409, description = "Applied version differs or a newer version exists", body = ErrorBody),
        (status = 413, description = "Request body is too large", body = ErrorBody),
        (status = 415, description = "Expected a JSON body", body = ErrorBody),
        (status = 503, description = "Database is busy", body = ErrorBody),
        (status = 504, description = "Migration timed out", body = ErrorBody),
    )
)]
pub async fn apply(
    State(state): State<AppState>,
    context: TenantAdminContext,
    ValidatedJson(request): ValidatedJson<MigrationRequest>,
) -> Result<(StatusCode, Json<MigrationRecord>), ApiError> {
    let _slot = state
        .database_session_slots
        .acquire(context.tenant_id)
        .await?;
    let outcome = apply_migration(&context.pool, context.actor, request).await?;

    match outcome {
        MigrationOutcome::Applied(record) => {
            let change = ProjectChange {
                tenant_id: context.tenant_id,
                author: context.author(),
                action: AuditAction::MigrationApplied,
                details: json!({ "version": record.version, "name": record.name }),
            };
            record_project_change(&state.tenant_pools, change).await;
            Ok((StatusCode::CREATED, Json(record)))
        }
        MigrationOutcome::AlreadyApplied(record) => Ok((StatusCode::OK, Json(record))),
    }
}
