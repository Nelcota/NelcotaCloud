use std::net::SocketAddr;

use tokio::net::TcpListener;

use crate::app_config::AppConfig;
use crate::router::build_router;
use crate::startup::app_state_builder::build_app_state;
use crate::startup::startup_error::StartupError;

pub async fn run_server(config: AppConfig) -> Result<(), StartupError> {
    let state = build_app_state(&config).await?;
    let listener = TcpListener::bind(&config.bind_address).await?;
    tracing::info!(address = %config.bind_address, "server listening");
    // Connect info gives handlers the peer address used for per-IP rate limits.
    let service = build_router(state).into_make_service_with_connect_info::<SocketAddr>();

    axum::serve(listener, service)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Ctrl-C, or SIGTERM (`docker stop`; the server runs as PID 1, where an unhandled SIGTERM is
/// ignored and Docker kills it without draining requests).
async fn shutdown_signal() {
    tokio::select! {
        () = interrupt() => {}
        () = terminate() => {}
    }

    tracing::info!("shutting down");
}

/// A signal that cannot be listened to never fires: it must not shut the server down.
async fn interrupt() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        tracing::error!(%error, "failed to listen for Ctrl-C");
        std::future::pending::<()>().await;
    }
}

#[cfg(unix)]
async fn terminate() {
    use tokio::signal::unix::{SignalKind, signal};

    match signal(SignalKind::terminate()) {
        Ok(mut terminate) => {
            terminate.recv().await;
        }
        Err(error) => {
            tracing::error!(%error, "failed to listen for SIGTERM");
            std::future::pending::<()>().await;
        }
    }
}

#[cfg(not(unix))]
async fn terminate() {
    std::future::pending::<()>().await;
}
