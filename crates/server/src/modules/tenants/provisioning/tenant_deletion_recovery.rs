use tokio::sync::watch;

use super::tenant_deletion::{pending_deletions, postpone_deletion};
use super::tenant_removal::TenantRemoval;

pub(crate) async fn recover_deletions(
    removal: &TenantRemoval<'_>,
    stopped: &watch::Receiver<bool>,
) {
    let pool = removal.control_plane_pool;
    let pending = match pending_deletions(pool).await {
        Ok(pending) => pending,
        Err(error) => {
            tracing::error!(%error, "failed to load pending tenant deletions");
            return;
        }
    };

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
