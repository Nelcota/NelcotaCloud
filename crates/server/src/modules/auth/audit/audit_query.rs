use sqlx::Postgres;
use sqlx::postgres::PgArguments;
use sqlx::query::QueryAs;
use uuid::Uuid;

use crate::modules::auth::audit::audit_kind::AuditKind;
use crate::modules::auth::audit::audit_period::AuditPeriod;
use crate::modules::tenants::audit::audit_retention::RETENTION_DAYS;
use crate::shared::text::contains_pattern::{contains_pattern, has_search_trigram};

/// Shared filters for pages and exports, including each branch of the indexed search.
macro_rules! audit_scope {
    () => {
        concat!(
            " WHERE ($1::uuid IS NULL OR user_id = $1)",
            " AND ($2::bigint IS NULL OR audit_events.id < $2)",
            " AND ($3::text[] IS NULL OR action = ANY($3))",
            " AND ($6::int IS NULL OR occurred_at >= now() - make_interval(days => $6))",
            " AND ($7::timestamptz IS NULL OR occurred_at >= $7)",
            " AND ($8::timestamptz IS NULL OR occurred_at < $8)",
            " AND occurred_at >= now() - make_interval(days => $9)",
        )
    };
}
pub(crate) use audit_scope;

pub struct AuditSelection {
    pub plain: &'static str,
    pub indexed: &'static str,
}

macro_rules! audit_selection {
    ($($columns:literal),+ $(,)?) => {
        crate::modules::auth::audit::audit_query::AuditSelection {
            plain: concat!(
                "SELECT ", $($columns,)+
                " FROM audit_events LEFT JOIN users ON users.id = audit_events.user_id",
                crate::modules::auth::audit::audit_query::audit_scope!(),
                r" AND ($4::text IS NULL OR COALESCE(users.email, audit_events.email) LIKE $4 ESCAPE '\'",
                r" OR audit_events.ip_address LIKE $4 ESCAPE '\')",
                " ORDER BY audit_events.id DESC LIMIT $5",
            ),
            indexed: concat!(
                "WITH scoped_events AS NOT MATERIALIZED (SELECT id, user_id, email, ip_address FROM audit_events",
                crate::modules::auth::audit::audit_query::audit_scope!(),
                "), ", include_str!("audit_search.sql"),
                " SELECT ", $($columns,)+
                " FROM matched JOIN audit_events ON audit_events.id = matched.id",
                " LEFT JOIN users ON users.id = audit_events.user_id ORDER BY audit_events.id DESC LIMIT $5",
            ),
        }
    };
}
pub(crate) use audit_selection;

/// What part of the log to read.
pub struct AuditQuery<'a> {
    /// Only events about this user; every event without it.
    pub user_id: Option<Uuid>,
    /// Only events of this kind; every kind without it.
    pub kind: Option<AuditKind>,
    /// Part of the email or IP address to search for.
    pub search: Option<&'a str>,
    /// Which stretch of the log to read.
    pub period: AuditPeriod,
    /// Only events older than this id.
    pub before: Option<i64>,
}

/// Short patterns keep the bounded walk of the recent feed. Selective searches can use GIN.
pub fn audit_statement<Row>(
    selection: &AuditSelection,
    query: &AuditQuery<'_>,
    row_limit: i64,
) -> QueryAs<'static, Postgres, Row, PgArguments>
where
    Row: for<'row> sqlx::FromRow<'row, sqlx::postgres::PgRow>,
{
    bind_audit_statement(selection, query, Some(row_limit))
}

pub fn bind_audit_statement<Row>(
    selection: &AuditSelection,
    query: &AuditQuery<'_>,
    row_limit: Option<i64>,
) -> QueryAs<'static, Postgres, Row, PgArguments>
where
    Row: for<'row> sqlx::FromRow<'row, sqlx::postgres::PgRow>,
{
    let statement = match query.search {
        Some(search) if row_limit.is_some() && has_search_trigram(search) => {
            // Both the search's selectivity and the optional scope affect which indexes to use.
            sqlx::query_as(selection.indexed).persistent(false)
        }
        _ => sqlx::query_as(selection.plain),
    };

    statement
        .bind(query.user_id)
        .bind(query.before)
        .bind(query.kind.map(AuditKind::actions))
        .bind(query.search.map(contains_pattern))
        .bind(row_limit)
        .bind(query.period.days())
        .bind(query.period.from())
        .bind(query.period.to())
        .bind(RETENTION_DAYS)
}
