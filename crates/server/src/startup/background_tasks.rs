use std::time::Duration;

use tokio::sync::watch;
use tokio::task::JoinSet;
use tokio::time::{interval, timeout};

use crate::app_state::AppState;
use crate::modules::auth::rate_limiting::shared_auth_limits::prune_auth_quotas;
use crate::modules::database::usage::usage_flush::run_usage_flush;
use crate::modules::notifications::alerts::alert_sweep::run_alert_sweep;
use crate::modules::oauth::login::oauth_state_repository::delete_expired_authorizations;
use crate::modules::storage::cleanup::owner_cleanup::run_owner_cleanup;
use crate::modules::storage::cleanup::storage_cleanup::run_cleanup;
use crate::modules::team::member::account_removal::recover_account_removals;
use crate::modules::team::notification::webhook_failure_sweep::run_webhook_failure_sweep;
use crate::modules::tenants::audit::project_audit_queue::recover_project_changes;
use crate::modules::tenants::provisioning::tenant_deletion_recovery::recover_deletions;
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
        tasks.spawn(run_webhook_failure_sweep(state.clone(), stopped.clone()));
        tasks.spawn(run_usage_flush(state.clone(), stopped.clone()));
        tasks.spawn(run_alert_sweep(state.clone(), stopped.clone()));
        tasks.spawn(run_owner_cleanup(
            state.control_plane_pool.clone(),
            state.tenant_pools.clone(),
            stopped.clone(),
        ));

        if let Some(store) = &state.storage_store {
            tasks.spawn(run_cleanup(
                state.control_plane_pool.clone(),
                store.clone(),
                stopped.clone(),
            ));
        }

        tasks.spawn(run_maintenance(state, stopped));

        Self { stop, tasks }
    }

    pub(super) async fn wait_for_exit(&mut self) -> StartupError {
        let exited = self.tasks.join_next().await;
        tracing::error!(?exited, "background task exited before shutdown");

        StartupError::BackgroundTaskStopped
    }

    pub(super) async fn stop(mut self) {
        self.stop.send_replace(true);

        if timeout(DRAIN_TIMEOUT, self.drain()).await.is_err() {
            tracing::warn!("background shutdown exceeded its drain deadline");
            self.tasks.shutdown().await;
        }
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

        if let Err(error) = prune_auth_quotas(pool).await {
            tracing::warn!(%error, "could not prune expired auth rate limits");
        }

        match timeout(TELEMETRY_TIMEOUT, prune_heartbeats(pool)).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => tracing::warn!(%error, "could not prune webhook worker heartbeats"),
            Err(_) => tracing::debug!("webhook worker heartbeat pruning timed out"),
        }

        match timeout(TELEMETRY_TIMEOUT, recover_account_removals(&state)).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => tracing::warn!(%error, "could not recover platform account removals"),
            Err(_) => tracing::debug!("platform account removal recovery timed out"),
        }

        recover_deletions(&state.tenant_removal(), &stopped).await;
        if let Err(error) = state.tenant_provisioner().recover_pending().await {
            tracing::error!(%error, "failed to recover interrupted tenant provisioning");
        }

        if let Err(error) = recover_project_changes(pool, &state.tenant_pools).await {
            tracing::error!(%error, "failed to recover project audit events");
        }
    }
}
