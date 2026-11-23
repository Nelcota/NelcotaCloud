use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::notifications::channel::channel_target::ChannelKind;
use crate::modules::notifications::channel::notification_channel::target_context;
use crate::modules::notifications::channel::notification_event::NotificationEvent;
use crate::shared::crypto::secret_box::SecretBox;

/// Where to send, opened from its sealed form; never serialized or logged.
pub struct Destination {
    pub channel_id: Uuid,
    pub kind: ChannelKind,
    pub address: String,
}

#[derive(sqlx::FromRow)]
struct SealedRow {
    id: Uuid,
    kind: String,
    target: Vec<u8>,
}

/// The channels of the project that receive `event`.
pub async fn destinations_for(
    (pool, secret_box): (&PgPool, &SecretBox),
    tenant_id: Uuid,
    event: NotificationEvent,
) -> Result<Vec<Destination>, sqlx::Error> {
    let rows: Vec<SealedRow> = sqlx::query_as(
        "SELECT id, kind, target FROM notification_channels \
         WHERE tenant_id = $1 AND $2 = ANY (events) ORDER BY created_at, id",
    )
    .bind(tenant_id)
    .bind(event.as_str())
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .filter_map(|row| open_row(secret_box, tenant_id, &row))
        .collect())
}

/// One channel of the project, for a test send; `None` when it does not exist.
pub async fn find_destination(
    (pool, secret_box): (&PgPool, &SecretBox),
    tenant_id: Uuid,
    channel_id: Uuid,
) -> Result<Option<Destination>, sqlx::Error> {
    let row: Option<SealedRow> = sqlx::query_as(
        "SELECT id, kind, target FROM notification_channels WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(channel_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(|row| open_row(secret_box, tenant_id, &row)))
}

/// A row that does not open (a rotated key, a tampered value) is skipped, and logged.
fn open_row(secret_box: &SecretBox, tenant_id: Uuid, row: &SealedRow) -> Option<Destination> {
    let channel_id = row.id;
    let kind = ChannelKind::parse(&row.kind)?;
    let opened = secret_box.open(&row.target, &target_context(tenant_id, channel_id));
    let address = opened.ok().and_then(|bytes| String::from_utf8(bytes).ok());

    let Some(address) = address else {
        tracing::error!(%channel_id, "could not open a notification channel's destination");
        return None;
    };

    Some(Destination {
        channel_id,
        kind,
        address,
    })
}
