use std::sync::Arc;
use std::time::Duration;

use tokio::sync::watch;
use tokio::time::timeout;

use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::webhooks::delivery::tenant_delivery_run::DeliveryContext;
use crate::modules::webhooks::delivery::webhook_worker::WebhookWorker;
use crate::modules::webhooks::health::worker_heartbeat::WorkerProgress;
use crate::startup::service_dependencies::{
    connect_control_plane, connect_runtime_control_plane, master_secret_box, webhook_transport,
};
use crate::startup::shutdown_signal::shutdown_signal;
use crate::startup::startup_error::StartupError;
use crate::startup::webhook_worker_config::WebhookWorkerConfig;

const DRAIN_TIMEOUT: Duration = Duration::from_secs(20);

pub async fn build_webhook_worker(
    config: &WebhookWorkerConfig,
) -> Result<WebhookWorker, StartupError> {
    config.validate()?;
    let secret_box = Arc::new(master_secret_box(&config.master_key_hex)?);
    let control_url = config.control_plane_database_url.trim();
    let managed_schema = config.database_schema_managed_externally.unwrap_or(false);
    let control_plane_pool = match managed_schema {
        true => connect_runtime_control_plane(control_url).await?,
        false => connect_control_plane(control_url).await?,
    };
    let registry = TenantPoolRegistry::new(
        control_plane_pool.clone(),
        config.tenant_database_base_url.trim().to_owned(),
    );
    let tenant_pools = Arc::new(match managed_schema {
        true => registry.with_managed_schema(),
        false => registry,
    });
    let context = DeliveryContext {
        control_plane_pool,
        tenant_pools,
        secret_box,
        transport: webhook_transport(config.webhook_allow_private_hosts)?,
        progress: watch::Sender::new(WorkerProgress::default()),
    };

    Ok(WebhookWorker::new(context))
}

pub async fn run_webhook_worker(config: &WebhookWorkerConfig) -> Result<(), StartupError> {
    let worker = build_webhook_worker(config).await?;
    let (stop, stopped) = watch::channel(false);
    let delivery = worker.run(stopped);
    tokio::pin!(delivery);
    tracing::info!("webhook worker started");

    tokio::select! {
        () = &mut delivery => Err(StartupError::BackgroundTaskStopped),
        () = shutdown_signal() => {
            stop.send_replace(true);
            if timeout(DRAIN_TIMEOUT, &mut delivery).await.is_err() {
                tracing::warn!("webhook worker exceeded its drain deadline; outstanding leases will expire");
            }

            Ok(())
        }
    }
}
