use sqlx::{PgConnection, PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::cleanup::owner_cleanup::schedule_owner_removal;
use crate::modules::team::rejection::team_rejection::TeamRejection;
use crate::modules::tenants::platform::membership_repository::lock_team_project;
use crate::modules::tenants::settings::email_verification_policy::requires_email_verification;
use crate::shared::http::api_error::ApiError;

pub struct AccountRemoval {
    transaction: Transaction<'static, Postgres>,
    account_id: Uuid,
}

/// The platform user row is already locked. Keep project locks through that transaction's
/// commit, and persist a cleanup intent alongside the user deletion.
pub async fn prepare_account_removal(
    state: &AppState,
    platform: &mut PgConnection,
    tenant_id: Uuid,
    account_id: Uuid,
) -> Result<Option<AccountRemoval>, ApiError> {
    if state.platform_tenant.find_optional_id().await? != Some(tenant_id) {
        return Ok(None);
    }

    let requires_verification =
        requires_email_verification(&state.control_plane_pool, tenant_id).await?;
    let mut removal = lock_account_projects(&state.control_plane_pool, account_id).await?;
    let owner_groups: Vec<Vec<Uuid>> = sqlx::query_scalar(
        "SELECT ARRAY(SELECT other.account_id FROM tenant_members AS other
             WHERE other.tenant_id = owner.tenant_id AND other.role = 'owner'
                 AND other.account_id <> owner.account_id)
         FROM tenant_members AS owner WHERE owner.account_id = $1 AND owner.role = 'owner'",
    )
    .bind(account_id)
    .fetch_all(&mut *removal.transaction)
    .await?;

    for candidates in owner_groups {
        if active_accounts(platform, &candidates, requires_verification)
            .await?
            .is_empty()
        {
            return Err(TeamRejection::LastOwner.into());
        }
    }

    sqlx::query("INSERT INTO platform_account_removals (account_id) VALUES ($1)")
        .bind(account_id)
        .execute(platform)
        .await?;

    Ok(Some(removal))
}

async fn lock_account_projects(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<AccountRemoval, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let projects: Vec<Uuid> = sqlx::query_scalar(
        "SELECT tenant_id FROM tenant_members WHERE account_id = $1 ORDER BY tenant_id",
    )
    .bind(account_id)
    .fetch_all(&mut *transaction)
    .await?;

    for project in projects {
        lock_team_project(&mut transaction, project).await?;
    }

    Ok(AccountRemoval {
        transaction,
        account_id,
    })
}

impl AccountRemoval {
    pub async fn finish(mut self, platform: &PgPool, tenant_id: Uuid) -> Result<(), ApiError> {
        sqlx::query(
            "DELETE FROM tenant_invitations AS invitation USING tenant_members AS member
             WHERE member.account_id = $1 AND invitation.tenant_id = member.tenant_id
                 AND invitation.email = member.account_email",
        )
        .bind(self.account_id)
        .execute(&mut *self.transaction)
        .await?;
        sqlx::query("DELETE FROM tenant_members WHERE account_id = $1")
            .bind(self.account_id)
            .execute(&mut *self.transaction)
            .await?;
        schedule_owner_removal(&mut *self.transaction, (tenant_id, self.account_id)).await?;
        self.transaction.commit().await?;
        sqlx::query("DELETE FROM platform_account_removals WHERE account_id = $1")
            .bind(self.account_id)
            .execute(platform)
            .await?;

        Ok(())
    }
}

pub async fn recover_account_removals(state: &AppState) -> Result<(), ApiError> {
    let Some(tenant_id) = state.platform_tenant.find_optional_id().await? else {
        return Ok(());
    };
    let platform = state
        .tenant_pools
        .pool_for(tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let accounts: Vec<Uuid> = sqlx::query_scalar(
        "SELECT account_id FROM platform_account_removals ORDER BY created_at, account_id LIMIT 16",
    )
    .fetch_all(&platform)
    .await?;

    for account_id in accounts {
        lock_account_projects(&state.control_plane_pool, account_id)
            .await?
            .finish(&platform, tenant_id)
            .await?;
    }

    Ok(())
}

pub async fn active_accounts(
    connection: &mut PgConnection,
    ids: &[Uuid],
    requires_verification: bool,
) -> Result<Vec<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM users WHERE id = ANY($1) AND banned_at IS NULL
            AND (NOT $2 OR email_verified_at IS NOT NULL)",
    )
    .bind(ids)
    .bind(requires_verification)
    .fetch_all(connection)
    .await
}
