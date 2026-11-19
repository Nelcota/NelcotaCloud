use std::net::IpAddr;

use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::ip_blocks::blocked_network::BlockedNetwork;

/// The most entries one project keeps; a list this long means a firewall is the better tool.
pub const MAX_BLOCKED_ADDRESSES: i64 = 500;

/// One blocked address or range.
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct BlockedAddress {
    pub id: Uuid,
    /// The address or range, such as `203.0.113.7/32` or `203.0.113.0/24`.
    pub network: String,
    pub note: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    /// When the block lapses; `null` blocks until removed.
    #[serde(with = "time::serde::rfc3339::option")]
    pub expires_at: Option<OffsetDateTime>,
}

pub struct NewBlock<'a> {
    pub network: BlockedNetwork,
    pub note: Option<&'a str>,
    pub expires_at: Option<OffsetDateTime>,
}

/// The columns every read returns. A macro, so each query is built at compile time.
macro_rules! columns {
    () => {
        "id, network::text AS network, note, created_at, expires_at"
    };
}

/// Blocks still in force, newest first.
pub async fn list_blocked_addresses(pool: &PgPool) -> Result<Vec<BlockedAddress>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        columns!(),
        " FROM blocked_addresses",
        " WHERE expires_at IS NULL OR expires_at > now() ORDER BY created_at DESC",
    ))
    .fetch_all(pool)
    .await
}

pub async fn count_blocked_addresses(pool: &PgPool) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar("SELECT count(*) FROM blocked_addresses")
        .fetch_one(pool)
        .await
}

/// Blocking a range that is already listed replaces its note and expiry, so a block can be
/// extended or made permanent without removing it first.
pub async fn insert_blocked_address(
    pool: &PgPool,
    block: NewBlock<'_>,
) -> Result<BlockedAddress, sqlx::Error> {
    sqlx::query_as(concat!(
        "INSERT INTO blocked_addresses (id, network, note, expires_at)",
        " VALUES ($1, network($2::inet), $3, $4)",
        " ON CONFLICT (network) DO UPDATE",
        " SET note = EXCLUDED.note, expires_at = EXCLUDED.expires_at",
        " RETURNING ",
        columns!(),
    ))
    .bind(Uuid::new_v4())
    .bind(block.network.to_string())
    .bind(block.note)
    .bind(block.expires_at)
    .fetch_one(pool)
    .await
}

/// The removed range, or `None` when there was no such entry.
pub async fn delete_blocked_address(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("DELETE FROM blocked_addresses WHERE id = $1 RETURNING network::text")
        .bind(id)
        .fetch_optional(pool)
        .await
}

/// Whether a block in force covers the address.
pub async fn is_address_blocked(pool: &PgPool, address: IpAddr) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM blocked_addresses \
         WHERE $1::inet <<= network AND (expires_at IS NULL OR expires_at > now()))",
    )
    .bind(address.to_string())
    .fetch_one(pool)
    .await
}
