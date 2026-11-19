use std::time::Duration;

use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::catalog::storage_cleanup::prune_erasure_guards;
use crate::modules::storage::catalog::user_erasure::{
    drain_user_erasure, reconcile_removed_owners,
};

pub async fn run_user_erasure(state: AppState, mut stop: watch::Receiver<bool>) {
    let mut ticks = interval(Duration::from_secs(15));
    ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);
    let mut cursor = None;

    loop {
        tokio::select! {
            _ = stop.changed() => return,
            _ = ticks.tick() => {
                match next_project(&state, cursor).await {
                    Ok(Some(project)) => {
                        cursor = Some(project);
                        reconcile_project(&state, project).await;
                    }
                    Ok(None) => {
                        cursor = None;
                        if let Err(error) = prune_erasure_guards(&state.control_plane_pool).await {
                            tracing::warn!(%error, "could not expire storage erasure guards");
                        }
                    }
                    Err(error) => tracing::warn!(%error, "could not find next project for storage erasure"),
                }
            }
        }
    }
}

async fn next_project(state: &AppState, cursor: Option<Uuid>) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT tenant_id FROM storage_objects
         WHERE owner_id IS NOT NULL AND ($1::uuid IS NULL OR tenant_id > $1)
         ORDER BY tenant_id LIMIT 1",
    )
    .bind(cursor)
    .fetch_optional(&state.control_plane_pool)
    .await
}

async fn reconcile_project(state: &AppState, project: Uuid) {
    let pool = match state.tenant_pools.pool_for(project).await {
        Ok(pool) => pool,
        Err(_) => {
            tracing::warn!("could not connect to a project to reconcile storage erasure");
            return;
        }
    };
    let control = &state.control_plane_pool;

    if drain_user_erasure(control, &pool, project).await.is_err() {
        tracing::warn!("could not drain project storage erasure outbox");
        return;
    }

    if reconcile_removed_owners(control, &pool, project)
        .await
        .is_err()
    {
        tracing::warn!("could not reconcile deleted storage owners");
    }
}
