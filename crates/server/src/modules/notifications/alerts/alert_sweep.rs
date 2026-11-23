use std::time::Duration;

use tokio::sync::watch;
use tokio::time::interval;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::alerts::alert_texts::{
    data_api_errors_text, login_failures_text, storage_text,
};
use crate::modules::notifications::alerts::alert_throttle::{
    alert_candidates, claim_alert, release_alert,
};
use crate::modules::notifications::alerts::login_alert_check::login_failure_spike;
use crate::modules::notifications::alerts::usage_alert_checks::{
    data_api_error_spikes, storage_near_limit,
};
use crate::modules::notifications::channel::notification_event::NotificationEvent;
use crate::modules::notifications::delivery::alert_dispatch::{AlertDraft, dispatch_alert};
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;

/// Conditions are measured over 15 minutes to an hour; looking every few minutes is plenty.
const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);

/// Checks every alert condition for the projects that subscribed to it, until shutdown.
pub async fn run_alert_sweep(state: AppState, mut stopped: watch::Receiver<bool>) {
    let mut ticks = interval(SWEEP_INTERVAL);

    loop {
        tokio::select! {
            _ = stopped.changed() => return,
            _ = ticks.tick() => {}
        }

        if let Err(error) = sweep_alerts(&state).await {
            tracing::warn!(%error, "notification sweep failed");
        }
    }
}

/// One pass over the three measured conditions; answers how many alerts went out.
pub async fn sweep_alerts(state: &AppState) -> Result<usize, sqlx::Error> {
    let mut sent = 0_usize;
    sent = sent.saturating_add(sweep_data_api_errors(state).await?);
    sent = sent.saturating_add(sweep_storage(state).await?);
    sent = sent.saturating_add(sweep_login_failures(state).await?);

    Ok(sent)
}

async fn sweep_data_api_errors(state: &AppState) -> Result<usize, sqlx::Error> {
    let event = NotificationEvent::DataApiErrors;
    let pool = &state.control_plane_pool;
    let candidates = alert_candidates(pool, event).await?;
    let mut sent = 0_usize;

    for spike in data_api_error_spikes(pool, &candidates).await? {
        let tenant_id = spike.tenant_id;
        let words = |name: &str| {
            data_api_errors_text((tenant_id, name), spike.requests, spike.server_errors)
        };
        sent = sent.saturating_add(alert(state, (tenant_id, event), words).await?);
    }

    Ok(sent)
}

async fn sweep_storage(state: &AppState) -> Result<usize, sqlx::Error> {
    let event = NotificationEvent::StorageNearLimit;
    let pool = &state.control_plane_pool;
    let candidates = alert_candidates(pool, event).await?;
    let mut sent = 0_usize;

    for usage in storage_near_limit(pool, &candidates).await? {
        let tenant_id = usage.tenant_id;
        let words = |name: &str| storage_text((tenant_id, name), (usage.bytes, usage.files));
        sent = sent.saturating_add(alert(state, (tenant_id, event), words).await?);
    }

    Ok(sent)
}

/// Opens only the databases of projects that asked for this alert.
async fn sweep_login_failures(state: &AppState) -> Result<usize, sqlx::Error> {
    let event = NotificationEvent::LoginFailures;
    let mut sent = 0_usize;

    for tenant_id in alert_candidates(&state.control_plane_pool, event).await? {
        let failures = match login_failure_spike(state, tenant_id).await {
            Ok(Some(failures)) => failures,
            Ok(None) => continue,
            Err(error) => {
                tracing::warn!(%tenant_id, %error, "could not check refused logins");
                continue;
            }
        };
        let words = |name: &str| login_failures_text((tenant_id, name), failures);
        sent = sent.saturating_add(alert(state, (tenant_id, event), words).await?);
    }

    Ok(sent)
}

/// Claims the alert, sends it, and gives the claim back if no channel received it.
async fn alert(
    state: &AppState,
    target: (Uuid, NotificationEvent),
    words: impl Fn(&str) -> AlertDraft,
) -> Result<usize, sqlx::Error> {
    let pool = &state.control_plane_pool;
    let (tenant_id, _) = target;

    if claim_alert(pool, target).await? == false {
        return Ok(0);
    }

    let Ok(project) = load_tenant_settings(pool, tenant_id).await else {
        release_alert(pool, target).await?;
        return Ok(0);
    };

    match dispatch_alert(state, target, &words(&project.name)).await {
        Ok(0) => {
            release_alert(pool, target).await?;
            Ok(0)
        }
        Ok(_) => Ok(1),
        Err(error) => {
            tracing::warn!(%tenant_id, %error, "could not send an alert");
            release_alert(pool, target).await?;
            Ok(0)
        }
    }
}
