use std::time::Duration;

use tokio::sync::{oneshot, watch};
use tokio::task::JoinSet;
use tokio::time::{interval, timeout};

use crate::app_state::AppState;
use crate::modules::oauth::login::oauth_state_repository::delete_expired_authorizations;
use crate::modules::storage::catalog::storage_cleanup::run_cleanup;
use crate::modules::tenants::provisioning::tenant_deletion::{
    pending_deletions, postpone_deletion,
};
use crate::modules::webhooks::health::worker_heartbeat::{TELEMETRY_TIMEOUT, prune_heartbeats};
use crate::modules::webhooks::outbox::webhook_hints::{WebhookHintReceiver, publish_hints};
use crate::startup::audit_maintenance::run_audit_maintenance;
use crate::startup::startup_error::StartupError;

const MAINTENANCE_INTERVAL: Duration = Duration::from_secs(15);
const DRAIN_TIMEOUT: Duration = Duration::from_secs(20);

pub struct BackgroundTasks {
    stop: watch::Sender<bool>,
    tasks: JoinSet<()>,
}

impl BackgroundTasks {
    pub fn start(state: AppState, webhook_hints: WebhookHintReceiver) -> Self {
        let (stop, stopped) = watch::channel(false);
        let mut tasks = JoinSet::new();
        tasks.spawn(publish_hints(
            state.control_plane_pool.clone(),
            webhook_hints,
            stopped.clone(),
        ));
        tasks.spawn(run_audit_maintenance(state.clone(), stopped.clone()));
        if let Some(store) = &state.storage_store {
            tasks.spawn(store.clone().monitor_health(stopped.clone()));
            tasks.spawn(run_cleanup(
                state.control_plane_pool.clone(),
                store.clone(),
                stopped.clone(),
            ));
        }

        tasks.spawn(crate::startup::storage_erasure::run_user_erasure(
            state.clone(),
            stopped.clone(),
        ));
        tasks.spawn(run_maintenance(state, stopped));

        Self { stop, tasks }
    }

    pub async fn supervise(
        mut self,
        shutdown: impl Future<Output = ()>,
        stop_http: oneshot::Sender<()>,
    ) -> Result<(), StartupError> {
        let outcome = tokio::select! {
            () = shutdown => Ok(()),
            exited = self.tasks.join_next() => {
                tracing::error!(?exited, "background task exited before shutdown");
                Err(StartupError::BackgroundTaskStopped)
            }
        };
        if stop_http.send(()).is_err() {
            tracing::debug!("HTTP service is already stopped");
        }

        self.stop.send_replace(true);
        if timeout(DRAIN_TIMEOUT, self.drain()).await.is_err() {
            tracing::warn!("background shutdown exceeded its drain deadline");
            self.tasks.shutdown().await;
        }

        outcome
    }

    async fn drain(&mut self) {
        while let Some(task) = self.tasks.join_next().await {
            if let Err(error) = task {
                tracing::error!(%error, "background task failed during shutdown");
            }
        }
    }
}

async fn run_maintenance(state: AppState, mut stopped: watch::Receiver<bool>) {
    let mut ticks = interval(MAINTENANCE_INTERVAL);

    loop {
        tokio::select! {
            _ = stopped.changed() => return,
            _ = ticks.tick() => {}
        }
        let pool = &state.control_plane_pool;
        state.rate_limits.forget_idle_keys();
        tracing::debug!(
            pool_size = pool.size(),
            idle_connections = pool.num_idle(),
            "control plane pool"
        );

        if let Err(error) = delete_expired_authorizations(pool).await {
            tracing::error!(%error, "failed to delete expired OAuth authorizations");
        }

        match timeout(TELEMETRY_TIMEOUT, prune_heartbeats(pool)).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => tracing::warn!(%error, "could not prune webhook worker heartbeats"),
            Err(_) => tracing::debug!("webhook worker heartbeat pruning timed out"),
        }

        recover_deletions(&state, &stopped).await;
    }
}

async fn recover_deletions(state: &AppState, stopped: &watch::Receiver<bool>) {
    let pool = &state.control_plane_pool;
    let pending = match pending_deletions(pool).await {
        Ok(pending) => pending,
        Err(error) => {
            tracing::error!(%error, "failed to load pending tenant deletions");
            return;
        }
    };
    let removal = state.tenant_removal();

    for tenant_id in pending {
        if *stopped.borrow() {
            break;
        }

        if let Err(error) = removal.finish_pending(tenant_id).await {
            tracing::error!(%tenant_id, %error, "failed to finish tenant deletion");
            if let Err(error) = postpone_deletion(pool, tenant_id).await {
                tracing::error!(%tenant_id, %error, "failed to postpone tenant deletion");
            }
        }
    }
}
