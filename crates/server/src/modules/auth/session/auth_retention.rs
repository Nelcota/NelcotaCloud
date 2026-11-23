use sqlx::PgPool;

const BATCH: i64 = 1_000;
const MAX_PASSES: usize = 8;

const PRUNE_REFRESH: &str =
    "DELETE FROM refresh_tokens WHERE id IN (
        SELECT id FROM refresh_tokens
        WHERE expires_at < now()
        AND created_at < ((date_trunc('month', now() AT TIME ZONE 'UTC') - interval '1 month') AT TIME ZONE 'UTC')
        ORDER BY expires_at LIMIT $1 FOR UPDATE SKIP LOCKED
    )";
const PRUNE_FAMILIES: &str = "DELETE FROM revoked_token_families WHERE family_id IN (
        SELECT family_id FROM revoked_token_families AS family
        WHERE revoked_at < now() - interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM refresh_tokens WHERE family_id = family.family_id)
        ORDER BY revoked_at LIMIT $1 FOR UPDATE SKIP LOCKED
    )";

macro_rules! delete_expired {
    ($table:literal, $key:literal) => {
        concat!(
            "DELETE FROM ",
            $table,
            " WHERE ",
            $key,
            " IN (SELECT ",
            $key,
            " FROM ",
            $table,
            " WHERE expires_at < now() ORDER BY expires_at LIMIT $1 FOR UPDATE SKIP LOCKED)"
        )
    };
}

/// Keep enough token history for active-user reports and enough family history for revocation.
/// The last login is recorded on the user independently of the retention window.
pub async fn prune_expired_auth(pool: &PgPool) -> Result<(), sqlx::Error> {
    let statements = [
        delete_expired!("one_time_tokens", "id"),
        delete_expired!("mfa_challenges", "token_hash"),
        delete_expired!("pending_magic_links", "token_hash"),
        PRUNE_REFRESH,
        PRUNE_FAMILIES,
    ];

    for statement in statements {
        for _ in 0..MAX_PASSES {
            let result = sqlx::query(statement).bind(BATCH).execute(pool).await?;

            if result.rows_affected() < BATCH.unsigned_abs() {
                break;
            }
        }
    }

    Ok(())
}
