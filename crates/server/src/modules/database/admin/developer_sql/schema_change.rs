use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::shared::http::api_error::ApiError;

/// Applies DDL built from a validated console request, as the project's developer role, in
/// one transaction. The database bumps its schema version, so the Data API sees the change on
/// its next request.
pub async fn apply_schema_change(
    state: &AppState,
    tenant_id: Uuid,
    statement: String,
) -> Result<(), ApiError> {
    let mut session = DeveloperSession::open(state, tenant_id).await?;
    session.execute(statement).await?;

    session.commit().await
}
