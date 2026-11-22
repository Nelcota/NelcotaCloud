use std::time::Duration;

use futures_util::stream::{self, StreamExt};
use tokio::sync::watch;
use tokio::time::{sleep, timeout};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::session::auth_retention::prune_expired_auth;
use crate::modules::tenants::audit::audit_retention::prune_expired_audit;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::provisioning::tenant_repository::tenant_ids_after;

const PAGE_SIZE: u16 = 32;
const PARALLEL_TENANTS: usize = 2;
const CLEANUP_INTERVAL: Duration = Duration::from_secs(60);
const STARTUP_PAGE_INTERVAL: Duration = Duration::from_secs(1);
const TENANT_TIMEOUT: Duration = Duration::from_secs(8);

pub(super) async fn run_audit_maintenance(state: AppState, mut stopped: watch::Receiver<bool>) {
    let mut initial_sweep = state.tenant_pools.manages_schema();
    let mut cursor = None;
    let mut delay = CLEANUP_INTERVAL;

    loop {
        tokio::select! {
            _ = stopped.changed() => return,
            () = sleep(delay) => {}
        }

        tokio::select! {
            _ = stopped.changed() => return,
            page = prune_page(&state, cursor) => cursor = page,
        }

        initial_sweep = initial_sweep && cursor.is_some();
        delay = if initial_sweep {
            STARTUP_PAGE_INTERVAL
        } else {
            CLEANUP_INTERVAL
        };
    }
}

async fn prune_page(state: &AppState, cursor: Option<Uuid>) -> Option<Uuid> {
    let tenant_ids =
        match tenant_ids_after(&state.control_plane_pool, cursor, i64::from(PAGE_SIZE)).await {
            Ok(tenant_ids) => tenant_ids,
            Err(error) => {
                tracing::warn!(%error, "could not load tenants for audit retention");
                return cursor;
            }
        };
    let next = if tenant_ids.len() == usize::from(PAGE_SIZE) {
        tenant_ids.last().copied()
    } else {
        None
    };
    let pools = &state.tenant_pools;
    stream::iter(tenant_ids)
        .map(|tenant_id| prune_tenant(pools, tenant_id))
        .buffer_unordered(PARALLEL_TENANTS)
        .for_each(|()| std::future::ready(()))
        .await;

    next
}

async fn prune_tenant(pools: &TenantPoolRegistry, tenant_id: Uuid) {
    let pool = match pools.audit_maintenance_pool(tenant_id).await {
        Ok(Some(pool)) => pool,
        Ok(None) => return,
        Err(error) => {
            tracing::warn!(%tenant_id, %error, "could not prepare tenant for audit retention");
            return;
        }
    };
    let outcome = timeout(TENANT_TIMEOUT, async {
        let (audit, auth) = tokio::join!(prune_expired_audit(&pool), prune_expired_auth(&pool));

        audit.and(auth)
    })
    .await;

    match outcome {
        Ok(Ok(())) => {}
        Ok(Err(error)) => tracing::warn!(%tenant_id, %error, "audit retention failed"),
        Err(_) => tracing::warn!(%tenant_id, "audit retention timed out"),
    }
}
