use std::time::Duration;

use futures_util::{StreamExt, stream};
use sqlx::PgPool;
use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval};

use super::deletion_repository::{acknowledge_deletion, claim_deletions, expire_uploads};
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::object_store::r2_store::R2Store;
use crate::shared::http::api_error::ApiError;

const CLEANUP_INTERVAL: Duration = Duration::from_secs(15);
const CONCURRENT_DELETIONS: usize = 4;

pub async fn run_cleanup(pool: PgPool, store: R2Store, mut stop: watch::Receiver<bool>) {
    let mut ticks = interval(CLEANUP_INTERVAL);
    ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            biased;
            _ = stop.changed() => return,
            _ = ticks.tick() => {}
        }

        if let Err(error) = drain_due_work(&pool, &store, &stop).await {
            tracing::error!(%error, "could not load storage cleanup batch");
        }
    }
}

async fn drain_due_work(
    pool: &PgPool,
    store: &R2Store,
    stop: &watch::Receiver<bool>,
) -> Result<(), sqlx::Error> {
    while *stop.borrow() == false {
        if cleanup_batch(pool, store).await? == false {
            break;
        }
    }

    Ok(())
}

async fn cleanup_batch(pool: &PgPool, store: &R2Store) -> Result<bool, sqlx::Error> {
    let expired = expire_uploads(pool).await?;
    let keys = claim_deletions(pool).await?;

    if expired == 0 && keys.is_empty() {
        return Ok(false);
    }

    stream::iter(keys)
        .for_each_concurrent(CONCURRENT_DELETIONS, |key| async move {
            if let Err(error) = delete_pending_object(pool, store, key).await {
                tracing::warn!(object_id = %key.id, %error, "storage deletion will be retried");
            }
        })
        .await;

    Ok(true)
}

async fn delete_pending_object(
    pool: &PgPool,
    store: &R2Store,
    key: ObjectKey,
) -> Result<(), ApiError> {
    store.delete(key).await?;
    acknowledge_deletion(pool, key.id).await?;

    Ok(())
}
