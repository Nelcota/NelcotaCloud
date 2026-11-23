use std::time::Duration;

use futures_util::{StreamExt, stream};
use sqlx::{PgConnection, PgPool, Postgres, Transaction, types::Json};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_actor::{AuditActor, AuditActorKind};
use crate::modules::tenants::audit::project_change::ProjectChange;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::shared::http::api_error::ApiError;

const DELIVERY_TIMEOUT: Duration = Duration::from_secs(2);

macro_rules! columns {
    () => {
        "id, tenant_id, action, actor, actor_account_id, ip_address, user_agent, request_id, details, occurred_at"
    };
}

#[derive(sqlx::FromRow)]
struct PendingAuditEvent {
    id: Uuid,
    tenant_id: Uuid,
    action: AuditAction,
    actor: AuditActorKind,
    actor_account_id: Option<Uuid>,
    ip_address: String,
    user_agent: Option<String>,
    request_id: Option<String>,
    details: Json<serde_json::Value>,
    occurred_at: OffsetDateTime,
}

async fn enqueue_project_change(
    connection: &mut PgConnection,
    change: ProjectChange<'_>,
) -> Result<Uuid, sqlx::Error> {
    let actor = AuditActor::from(change.author.0);
    let origin = change.author.1;
    sqlx::query_scalar(
        "INSERT INTO project_audit_queue
         (tenant_id, action, actor, actor_account_id, ip_address, user_agent, request_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    )
    .bind(change.tenant_id)
    .bind(change.action)
    .bind(actor.kind)
    .bind(actor.account_id)
    .bind(origin.client_ip.to_string())
    .bind(&origin.user_agent)
    .bind(&origin.request_id)
    .bind(Json(change.details))
    .fetch_one(connection)
    .await
}

/// Lock the project before changing any child rows, in the same order as project deletion.
pub async fn begin_project_change(
    control: &PgPool,
    tenant_id: Uuid,
) -> Result<Transaction<'static, Postgres>, ApiError> {
    let mut transaction = control.begin().await?;
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(tenant_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(ApiError::NotFound("project"))?;

    Ok(transaction)
}

/// Commit the administrative change and its audit record together.
pub async fn commit_project_change(
    state: &AppState,
    mut transaction: Transaction<'_, Postgres>,
    change: ProjectChange<'_>,
) -> Result<(), ApiError> {
    let id = enqueue_project_change(&mut transaction, change).await?;
    transaction.commit().await?;
    deliver_project_change(&state.control_plane_pool, &state.tenant_pools, id).await;

    Ok(())
}

/// Record the event immediately when possible. The queue row remains after a delivery failure.
async fn deliver_project_change(control: &PgPool, tenants: &TenantPoolRegistry, id: Uuid) {
    let attempt = async {
        let event = sqlx::query_as(concat!(
            "SELECT ",
            columns!(),
            " FROM project_audit_queue WHERE id = $1"
        ))
        .bind(id)
        .fetch_optional(control)
        .await?;

        if let Some(event) = event {
            deliver(control, tenants, event).await?;
        }

        Ok(())
    };
    log_outcome(id, tokio::time::timeout(DELIVERY_TIMEOUT, attempt).await);
}

pub async fn recover_project_changes(
    control: &PgPool,
    tenants: &TenantPoolRegistry,
) -> Result<(), sqlx::Error> {
    let pending: Vec<PendingAuditEvent> = sqlx::query_as(concat!(
        "UPDATE project_audit_queue SET next_attempt_at = now() + interval '30 seconds'
         WHERE id IN (SELECT id FROM project_audit_queue WHERE next_attempt_at <= now()
           ORDER BY next_attempt_at, id LIMIT 32 FOR UPDATE SKIP LOCKED)
         RETURNING ",
        columns!()
    ))
    .fetch_all(control)
    .await?;
    stream::iter(pending)
        .for_each_concurrent(4, |event| async move {
            let id = event.id;
            log_outcome(
                id,
                tokio::time::timeout(DELIVERY_TIMEOUT, deliver(control, tenants, event)).await,
            );
        })
        .await;

    Ok(())
}

async fn deliver(
    control: &PgPool,
    tenants: &TenantPoolRegistry,
    event: PendingAuditEvent,
) -> Result<(), ApiError> {
    let pool = tenants
        .pool_for(event.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    sqlx::query(
        "INSERT INTO auth.audit_events
         (source_id, action, actor, actor_account_id, ip_address, user_agent, request_id, details, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (source_id) DO NOTHING",
    )
    .bind(event.id)
    .bind(event.action)
    .bind(event.actor)
    .bind(event.actor_account_id)
    .bind(event.ip_address)
    .bind(event.user_agent)
    .bind(event.request_id)
    .bind(event.details)
    .bind(event.occurred_at)
    .execute(&pool)
    .await?;
    sqlx::query("DELETE FROM project_audit_queue WHERE id = $1")
        .bind(event.id)
        .execute(control)
        .await?;

    Ok(())
}

fn log_outcome(id: Uuid, outcome: Result<Result<(), ApiError>, tokio::time::error::Elapsed>) {
    match outcome {
        Ok(Ok(())) => {}
        Ok(Err(error)) => tracing::warn!(%id, ?error, "project audit delivery will be retried"),
        Err(_) => tracing::warn!(%id, "project audit delivery timed out"),
    }
}
