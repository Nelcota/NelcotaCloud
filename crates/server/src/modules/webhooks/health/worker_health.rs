use axum::http::StatusCode;
use axum::{Json, extract::State};
use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use tokio::time::timeout;

use crate::app_state::AppState;
use crate::modules::tenants::access::admin_access::AdminAccess;
use crate::modules::webhooks::health::worker_heartbeat::TELEMETRY_TIMEOUT;

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
enum WorkerStatus {
    Operational,
    ReducedRedundancy,
    NoRecentHeartbeat,
    Unknown,
}

#[derive(Serialize)]
pub struct WorkerHealth {
    status: WorkerStatus,
    expected_replicas: u16,
    #[serde(flatten)]
    observation: Option<WorkerObservation>,
}

#[derive(Serialize, sqlx::FromRow)]
struct WorkerObservation {
    live_replicas: i64,
    #[serde(with = "time::serde::rfc3339::option")]
    last_seen_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    last_poll_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    last_batch_at: Option<OffsetDateTime>,
}

pub async fn worker_health(
    State(state): State<AppState>,
    _admin: AdminAccess,
) -> (StatusCode, Json<WorkerHealth>) {
    let expected_replicas = state.settings.webhook_worker_replicas;
    let observation = match timeout(
        TELEMETRY_TIMEOUT,
        read_heartbeats(&state.control_plane_pool),
    )
    .await
    {
        Ok(Ok(observation)) => Some(observation),
        Ok(Err(error)) => {
            tracing::warn!(%error, "could not read webhook worker health");
            None
        }
        Err(_) => None,
    };
    let status = match observation.as_ref().map(|reading| reading.live_replicas) {
        None => WorkerStatus::Unknown,
        Some(0) => WorkerStatus::NoRecentHeartbeat,
        Some(live) if live < i64::from(expected_replicas) => WorkerStatus::ReducedRedundancy,
        Some(_) => WorkerStatus::Operational,
    };
    let code = match status {
        WorkerStatus::Unknown => StatusCode::SERVICE_UNAVAILABLE,
        _ => StatusCode::OK,
    };

    (
        code,
        Json(WorkerHealth {
            status,
            expected_replicas,
            observation,
        }),
    )
}

async fn read_heartbeats(pool: &PgPool) -> Result<WorkerObservation, sqlx::Error> {
    sqlx::query_as(
        "SELECT count(*) FILTER (WHERE last_seen_at >= now() - interval '40 seconds') AS live_replicas, \
         max(last_seen_at) AS last_seen_at, max(last_poll_at) AS last_poll_at, max(last_batch_at) AS last_batch_at \
         FROM webhook_worker_heartbeats WHERE last_seen_at >= now() - interval '24 hours'",
    )
    .fetch_one(pool)
    .await
}
