/// Ctrl-C, or SIGTERM (`docker stop`; the server runs as PID 1, where an unhandled SIGTERM is
/// ignored and Docker kills it without draining requests).
pub(super) async fn shutdown_signal() {
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
