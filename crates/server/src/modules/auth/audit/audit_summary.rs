use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;

use crate::modules::auth::audit::audit_period::AuditPeriod;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_retention::RETENTION_DAYS;

/// How many addresses the summary lists; enough to spot an attack, short enough to read.
const FAILING_ADDRESS_LIMIT: i64 = 5;

/// What happened in the project over a period, so the log answers "anything unusual?" first.
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct AuditSummary {
    /// Successful logins.
    pub logins: i64,
    /// Distinct accounts that logged in.
    pub active_users: i64,
    /// Refused logins (wrong email or password).
    pub failures: i64,
    /// Changes to users: password, data, ban, deletion, sessions, authenticator.
    pub changes: i64,
    /// The IP addresses with the most refused logins, most first.
    #[sqlx(json)]
    pub failing_addresses: Vec<FailingAddress>,
}

/// One IP address and the refused logins that came from it.
#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct FailingAddress {
    pub ip_address: String,
    pub failures: i64,
    /// Distinct emails it tried; many means one source guessing across accounts.
    pub accounts: i64,
    #[serde(with = "time::serde::rfc3339")]
    pub last_seen_at: OffsetDateTime,
}

/// Counts and the most refused addresses over the period.
pub async fn summarize_audit_events(
    pool: &PgPool,
    period: AuditPeriod,
) -> Result<AuditSummary, sqlx::Error> {
    let mut transaction = pool.begin_with("BEGIN READ ONLY").await?;

    // The database clock defines retention, and the planner needs the resolved bound.
    // Disable presorting so the DISTINCT aggregate only sorts rows passing its login filter.
    let (from, _): (OffsetDateTime, String) = sqlx::query_as(
        "SELECT GREATEST(now() - make_interval(days => $1), \
         now() - make_interval(days => $2), $3::timestamptz), \
         set_config('enable_presorted_aggregate', 'off', true)",
    )
    .bind(RETENTION_DAYS)
    .bind(period.days())
    .bind(period.from())
    .fetch_one(&mut *transaction)
    .await?;

    let summary = sqlx::query_as(include_str!("audit_summary.sql"))
        // A custom plan can choose a range scan for the actual bounds.
        .persistent(false)
        .bind(from)
        .bind(period.to())
        .bind(&AuditAction::USER_CHANGES[..])
        .bind(FAILING_ADDRESS_LIMIT)
        .fetch_one(&mut *transaction)
        .await?;

    transaction.commit().await?;
    Ok(summary)
}
