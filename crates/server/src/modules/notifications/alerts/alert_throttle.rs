use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::notifications::channel::notification_event::NotificationEvent;

/// A condition that lasts alerts again only after this many hours.
const ALERT_COOLDOWN_HOURS: i32 = 6;

/// Projects with a channel for `event` that were not alerted about it in the cooldown.
pub async fn alert_candidates(
    pool: &PgPool,
    event: NotificationEvent,
) -> Result<Vec<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT DISTINCT channel.tenant_id FROM notification_channels AS channel \
         WHERE $1 = ANY (channel.events) AND NOT EXISTS ( \
             SELECT 1 FROM notification_alerts AS alert \
             WHERE alert.tenant_id = channel.tenant_id AND alert.event = $1 \
               AND alert.last_sent_at >= now() - make_interval(hours => $2))",
    )
    .bind(event.as_str())
    .bind(ALERT_COOLDOWN_HOURS)
    .fetch_all(pool)
    .await
}

/// Takes the right to send this alert now; `false` when another instance just did.
pub async fn claim_alert(
    pool: &PgPool,
    (tenant_id, event): (Uuid, NotificationEvent),
) -> Result<bool, sqlx::Error> {
    let claimed: Option<i32> = sqlx::query_scalar(
        "INSERT INTO notification_alerts (tenant_id, event, last_sent_at) VALUES ($1, $2, now()) \
         ON CONFLICT (tenant_id, event) DO UPDATE SET last_sent_at = now() \
         WHERE notification_alerts.last_sent_at < now() - make_interval(hours => $3) \
         RETURNING 1",
    )
    .bind(tenant_id)
    .bind(event.as_str())
    .bind(ALERT_COOLDOWN_HOURS)
    .fetch_optional(pool)
    .await?;

    Ok(claimed.is_some())
}

/// Gives the claim back when no channel received the alert, so the next sweep tries again.
pub async fn release_alert(
    pool: &PgPool,
    (tenant_id, event): (Uuid, NotificationEvent),
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM notification_alerts WHERE tenant_id = $1 AND event = $2")
        .bind(tenant_id)
        .bind(event.as_str())
        .execute(pool)
        .await?;

    Ok(())
}
