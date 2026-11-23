use std::time::Duration;

use tokio::sync::watch;
use tokio::time::interval;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::notification::webhook_failure_alert::{
    WebhookAlertKind, send_webhook_alert,
};
use crate::modules::webhooks::health::failing_endpoints::{
    FailingEndpoint, claim_failure_alerts, pause_failing_endpoints, release_failure_alert,
};

/// Thresholds are hours and days apart; looking every few minutes is plenty.
const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);

/// What one sweep did.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct SweepReport {
    pub alerted: usize,
    pub paused: usize,
}

/// Alerts owners about failing endpoints and pauses the ones failing for days, until shutdown.
pub async fn run_webhook_failure_sweep(state: AppState, mut stopped: watch::Receiver<bool>) {
    let mut ticks = interval(SWEEP_INTERVAL);

    loop {
        tokio::select! {
            _ = stopped.changed() => return,
            _ = ticks.tick() => {}
        }

        if let Err(error) = sweep_failing_webhooks(&state).await {
            tracing::warn!(%error, "webhook failure sweep failed");
        }
    }
}

/// One pass: alerts first, then pauses. Without a platform tenant there is no sender, so
/// alerts wait for it; pausing does not.
pub async fn sweep_failing_webhooks(state: &AppState) -> Result<SweepReport, sqlx::Error> {
    let pool = &state.control_plane_pool;
    let platform_tenant_id = state.platform_tenant.find_optional_id().await?;
    let mut report = SweepReport::default();

    if let Some(platform_tenant_id) = platform_tenant_id {
        for endpoint in claim_failure_alerts(pool).await? {
            if alert_or_release(state, platform_tenant_id, &endpoint).await? {
                report.alerted = report.alerted.saturating_add(1);
            }
        }
    }

    let paused = pause_failing_endpoints(pool).await?;
    report.paused = paused.len();

    if let Some(platform_tenant_id) = platform_tenant_id {
        notify_paused(state, platform_tenant_id, &paused).await;
    }

    Ok(report)
}

/// Whether the owners were told; a failed alert is released, so the next sweep retries it.
async fn alert_or_release(
    state: &AppState,
    platform_tenant_id: Uuid,
    endpoint: &FailingEndpoint,
) -> Result<bool, sqlx::Error> {
    let alert = (endpoint, WebhookAlertKind::Failing);

    match send_webhook_alert(state, platform_tenant_id, alert).await {
        Ok(()) => Ok(true),
        Err(error) => {
            let endpoint_id = endpoint.id;
            tracing::warn!(%error, %endpoint_id, "could not alert owners about a failing webhook");
            release_failure_alert(&state.control_plane_pool, endpoint_id).await?;
            Ok(false)
        }
    }
}

/// The pause already happened; a notice that cannot be sent is logged, not retried.
async fn notify_paused(state: &AppState, platform_tenant_id: Uuid, paused: &[FailingEndpoint]) {
    for endpoint in paused {
        let alert = (endpoint, WebhookAlertKind::Paused);

        if let Err(error) = send_webhook_alert(state, platform_tenant_id, alert).await {
            let endpoint_id = endpoint.id;
            tracing::warn!(%error, %endpoint_id, "could not tell owners about a paused webhook");
        }
    }
}
