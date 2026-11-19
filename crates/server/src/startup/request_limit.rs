use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::client_ip::ClientIp;

/// Every request of one client, whatever the route or project.
///
/// The floor under the per-route limits, so no client can flood the API (and the databases behind it) by spreading its
/// requests over routes and projects.
pub async fn limit_client_requests(
    State(state): State<AppState>,
    ClientIp(client_ip): ClientIp,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    state
        .rate_limits
        .requests_per_client_ip
        .check(Uuid::nil(), client_ip)?;

    Ok(next.run(request).await)
}
