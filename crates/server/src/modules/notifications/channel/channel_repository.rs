use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::notifications::channel::channel_target::ChannelKind;
use crate::modules::notifications::channel::notification_channel::NotificationChannel;
use crate::modules::notifications::channel::notification_event::NotificationEvent;

/// A project may notify this many places.
pub const MAX_CHANNELS_PER_PROJECT: i64 = 5;

#[derive(sqlx::FromRow)]
struct ChannelRow {
    id: Uuid,
    kind: String,
    target_hint: String,
    events: Vec<String>,
    created_at: OffsetDateTime,
}

impl ChannelRow {
    /// Rows the table's checks let in always parse; anything else is skipped and logged.
    fn into_channel(self) -> Option<NotificationChannel> {
        let Some(kind) = ChannelKind::parse(&self.kind) else {
            tracing::error!(channel_id = %self.id, "notification channel of unknown kind");
            return None;
        };

        Some(NotificationChannel {
            id: self.id,
            kind,
            target_hint: self.target_hint,
            events: self
                .events
                .iter()
                .filter_map(|event| NotificationEvent::parse(event))
                .collect(),
            created_at: self.created_at,
        })
    }
}

pub async fn list_channels(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<NotificationChannel>, sqlx::Error> {
    let rows: Vec<ChannelRow> = sqlx::query_as(
        "SELECT id, kind, target_hint, events, created_at FROM notification_channels \
         WHERE tenant_id = $1 ORDER BY created_at, id",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .filter_map(ChannelRow::into_channel)
        .collect())
}

/// A new channel, unless the project already has the maximum (checked in the same statement,
/// under a lock on the project's row, so two concurrent saves cannot both pass).
pub struct NewChannel<'a> {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub kind: ChannelKind,
    pub sealed_target: &'a [u8],
    pub hint: &'a str,
    pub events: &'a [NotificationEvent],
}

pub async fn insert_channel(
    pool: &PgPool,
    channel: NewChannel<'_>,
) -> Result<Option<NotificationChannel>, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    sqlx::query("SELECT 1 FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(channel.tenant_id)
        .execute(&mut *transaction)
        .await?;
    let row: Option<ChannelRow> = sqlx::query_as(
        "INSERT INTO notification_channels (id, tenant_id, kind, target, target_hint, events) \
         SELECT $1, $2, $3, $4, $5, $6 \
         WHERE (SELECT count(*) FROM notification_channels WHERE tenant_id = $2) < $7 \
         RETURNING id, kind, target_hint, events, created_at",
    )
    .bind(channel.id)
    .bind(channel.tenant_id)
    .bind(channel.kind.as_str())
    .bind(channel.sealed_target)
    .bind(channel.hint)
    .bind(event_names(channel.events))
    .bind(MAX_CHANNELS_PER_PROJECT)
    .fetch_optional(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(row.and_then(ChannelRow::into_channel))
}

/// `None` when the project has no such channel.
pub async fn change_channel_events(
    pool: &PgPool,
    (tenant_id, channel_id): (Uuid, Uuid),
    events: &[NotificationEvent],
) -> Result<Option<NotificationChannel>, sqlx::Error> {
    let row: Option<ChannelRow> = sqlx::query_as(
        "UPDATE notification_channels SET events = $3 WHERE tenant_id = $1 AND id = $2 \
         RETURNING id, kind, target_hint, events, created_at",
    )
    .bind(tenant_id)
    .bind(channel_id)
    .bind(event_names(events))
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(ChannelRow::into_channel))
}

pub async fn delete_channel(
    pool: &PgPool,
    (tenant_id, channel_id): (Uuid, Uuid),
) -> Result<bool, sqlx::Error> {
    let deleted = sqlx::query("DELETE FROM notification_channels WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(channel_id)
        .execute(pool)
        .await?;

    Ok(deleted.rows_affected() > 0)
}

fn event_names(events: &[NotificationEvent]) -> Vec<&'static str> {
    events.iter().map(|event| event.as_str()).collect()
}
