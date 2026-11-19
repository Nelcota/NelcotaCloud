use std::future::IntoFuture;
use std::net::SocketAddr;

use tokio::net::TcpListener;
use tokio::sync::oneshot;

use crate::app_config::AppConfig;
use crate::router::build_router;
use crate::startup::app_state_builder::build_app_state;
use crate::startup::shutdown_signal::shutdown_signal;
use crate::startup::startup_error::StartupError;

pub async fn run_server(config: AppConfig) -> Result<(), StartupError> {
    let (state, tasks) = build_app_state(&config).await?;
    let listener = TcpListener::bind(&config.bind_address).await?;
    tracing::info!(address = %config.bind_address, "server listening");
    // Connect info gives handlers the peer address used for per-IP rate limits.
    let service = build_router(state).into_make_service_with_connect_info::<SocketAddr>();

    let (stop_http, stopped) = oneshot::channel();
    let http = axum::serve(listener, service).with_graceful_shutdown(async move {
        if stopped.await.is_err() {
            tracing::warn!("background supervisor stopped without signaling HTTP");
        }
    });
    let http = http.into_future();
    let supervision = tasks.supervise(shutdown_signal(), stop_http);
    tokio::pin!(http, supervision);

    tokio::select! {
        result = &mut http => {
            result?;
            supervision.await
        }
        result = &mut supervision => {
            http.await?;
            result
        }
    }
}
