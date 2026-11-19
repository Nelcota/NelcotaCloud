use std::time::{Duration, Instant};

use sqlx::PgPool;
use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval, timeout};
use uuid::Uuid;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(10);
pub const TELEMETRY_TIMEOUT: Duration = Duration::from_millis(500);

/// Timings on the worker's monotonic clock, converted to database times when published.
#[derive(Clone, Copy, Default)]
pub struct WorkerProgress {
    last_poll: Option<Instant>,
    last_batch: Option<Instant>,
}

impl WorkerProgress {
    pub fn record_poll(&mut self) {
        self.last_poll = Some(Instant::now());
    }

    pub fn record_batch(&mut self) {
        self.last_batch = Some(Instant::now());
    }
}

pub async fn publish_heartbeats(
    pool: &PgPool,
    progress: watch::Receiver<WorkerProgress>,
    mut stopped: watch::Receiver<bool>,
) {
    let replica_id = Uuid::new_v4();
    let mut ticks = interval(HEARTBEAT_INTERVAL);
    ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);
    let mut published = WorkerProgress::default();

    loop {
        tokio::select! {
            biased;
            _ = stopped.changed() => return,
            _ = ticks.tick() => {}
        }
        let latest = *progress.borrow();
        let changes = WorkerProgress {
            last_poll: latest
                .last_poll
                .filter(|poll| Some(*poll) != published.last_poll),
            last_batch: latest
                .last_batch
                .filter(|batch| Some(*batch) != published.last_batch),
        };
        match timeout(
            TELEMETRY_TIMEOUT,
            write_heartbeat(pool, replica_id, changes),
        )
        .await
        {
            Ok(Ok(())) => published = latest,
            Ok(Err(error)) => tracing::warn!(%error, "could not record webhook worker heartbeat"),
            Err(_) => tracing::warn!("webhook worker heartbeat timed out"),
        }
    }
}

async fn write_heartbeat(
    pool: &PgPool,
    replica_id: Uuid,
    progress: WorkerProgress,
) -> Result<(), sqlx::Error> {
    let seen = Instant::now();
    let poll_age = progress
        .last_poll
        .map(|poll| seen.saturating_duration_since(poll).as_secs_f64());
    let batch_age = progress
        .last_batch
        .map(|batch| seen.saturating_duration_since(batch).as_secs_f64());
    sqlx::query(
        "INSERT INTO webhook_worker_heartbeats (replica_id, last_seen_at, last_poll_at, last_batch_at) \
         VALUES ($1, statement_timestamp(), statement_timestamp() - $2::float8 * interval '1 second', \
                 statement_timestamp() - $3::float8 * interval '1 second') \
         ON CONFLICT (replica_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, \
             last_poll_at = GREATEST(webhook_worker_heartbeats.last_poll_at, EXCLUDED.last_poll_at), \
             last_batch_at = GREATEST(webhook_worker_heartbeats.last_batch_at, EXCLUDED.last_batch_at)",
    )
    .bind(replica_id)
    .bind(poll_age)
    .bind(batch_age)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn prune_heartbeats(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM webhook_worker_heartbeats WHERE last_seen_at < now() - interval '24 hours'",
    )
    .execute(pool)
    .await?;
    Ok(())
}
