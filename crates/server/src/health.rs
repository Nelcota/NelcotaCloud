use std::time::Duration;

use axum::extract::State;
use axum::http::StatusCode;
use tokio::time::timeout;

use crate::app_state::AppState;

const READINESS_TIMEOUT: Duration = Duration::from_secs(2);

#[utoipa::path(
    get,
    path = "/health",
    tag = "system",
    responses(
        (status = 200, description = "The API is up", body = String, content_type = "text/plain"),
    )
)]
pub async fn health() -> &'static str {
    "ok"
}

pub async fn readiness(State(state): State<AppState>) -> StatusCode {
    let pool = &state.control_plane_pool;
    let probe = sqlx::query("SELECT 1").execute(pool);

    match timeout(READINESS_TIMEOUT, probe).await {
        Ok(Ok(_)) => StatusCode::OK,
        _ => StatusCode::SERVICE_UNAVAILABLE,
    }
}
