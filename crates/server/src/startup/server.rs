use std::future::IntoFuture;
use std::net::SocketAddr;
use std::time::Duration;

use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::time::timeout;

use crate::app_config::AppConfig;
use crate::router::build_router;
use crate::startup::app_state_builder::build_app_state;
use crate::startup::shutdown_signal::shutdown_signal;
use crate::startup::startup_error::StartupError;

const HTTP_DRAIN_TIMEOUT: Duration = Duration::from_secs(60);

pub async fn run_server(config: AppConfig) -> Result<(), StartupError> {
    let (state, mut tasks) = build_app_state(&config).await?;
    let listener = TcpListener::bind(&config.bind_address).await?;
    tracing::info!(address = %config.bind_address, "server listening");
    // Connect info gives handlers the peer address used for per-IP rate limits.
    let service = build_router(state).into_make_service_with_connect_info::<SocketAddr>();

    let (stop_http, stopped) = oneshot::channel();
    let http = axum::serve(listener, service).with_graceful_shutdown(async move {
        if stopped.await.is_err() {
            tracing::debug!("HTTP shutdown sender was dropped");
        }
    });
    let http = http.into_future();
    tokio::pin!(http);

    let result = tokio::select! {
        result = &mut http => result.map_err(StartupError::from),
        () = shutdown_signal() => drain_http(stop_http, &mut http).await,
        error = tasks.wait_for_exit() => {
            if let Err(error) = drain_http(stop_http, &mut http).await {
                tracing::error!(%error, "HTTP failed during shutdown");
            }

            Err(error)
        }
    };
    tasks.stop().await;

    result
}

async fn drain_http(
    stop: oneshot::Sender<()>,
    http: impl Future<Output = std::io::Result<()>>,
) -> Result<(), StartupError> {
    if stop.send(()).is_err() {
        tracing::debug!("HTTP service is already stopped");
    }

    match timeout(HTTP_DRAIN_TIMEOUT, http).await {
        Ok(result) => result.map_err(StartupError::from),
        Err(_) => {
            tracing::warn!("HTTP shutdown exceeded its drain deadline");
            Ok(())
        }
    }
}
