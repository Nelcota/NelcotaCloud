use std::net::IpAddr;
use std::time::Duration;

use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::auth::rate_limiting::rate_limit_quotas::{
    AVATAR_CHANGE_PER_ACCOUNT, EMAIL_PER_ADDRESS, EMAIL_PER_CLIENT_IP, EMAIL_PER_PROJECT,
    EMAIL_PER_RECIPIENT, LOGIN_PER_CLIENT_IP, LOGIN_PER_EMAIL, LOGIN_PER_EMAIL_FROM_NETWORK,
    MFA_PER_ACCOUNT, MFA_PER_CLIENT_IP, PASSWORD_WORK_PER_CLIENT_IP, PROFILE_UPDATE_PER_ACCOUNT,
    SIGNUP_PER_CLIENT_IP, SIGNUP_PER_EMAIL, TOKEN_REDEMPTION_PER_CLIENT_IP,
};
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::rate_limiting::attempt_limiter::Attempt;
use crate::shared::rate_limiting::client_ip_limiter::client_network;
use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Auth quotas are shared by all replicas, including installations without a Cache backend.
pub struct SharedAuthLimits(pub PgPool);

type Bucket = (String, &'static QuotaSpec);

impl SharedAuthLimits {
    pub async fn check_login(&self, attempt: &Attempt<'_>) -> Result<(), ApiError> {
        let (tenant, email, network) = dimensions(attempt);
        self.reserve([
            (
                format!("login-network:{tenant}:{network}"),
                &LOGIN_PER_CLIENT_IP,
            ),
            (
                format!("login-account-network:{tenant}:{network}:{email}"),
                &LOGIN_PER_EMAIL_FROM_NETWORK,
            ),
            (format!("login-account:{tenant}:{email}"), &LOGIN_PER_EMAIL),
            (
                format!("password-work:{network}"),
                &PASSWORD_WORK_PER_CLIENT_IP,
            ),
        ])
        .await
    }

    pub async fn check_signup(&self, attempt: &Attempt<'_>) -> Result<(), ApiError> {
        let (tenant, email, network) = dimensions(attempt);
        self.reserve([
            (
                format!("signup-network:{tenant}:{network}"),
                &SIGNUP_PER_CLIENT_IP,
            ),
            (
                format!("signup-account:{tenant}:{email}"),
                &SIGNUP_PER_EMAIL,
            ),
            (
                format!("password-work:{network}"),
                &PASSWORD_WORK_PER_CLIENT_IP,
            ),
        ])
        .await
    }

    pub async fn check_email(&self, attempt: &Attempt<'_>) -> Result<(), ApiError> {
        self.reserve(email_buckets(attempt)).await
    }

    /// The caller already has a control-plane transaction and rolls it back on refusal.
    pub async fn check_email_in(
        connection: &mut PgConnection,
        attempt: &Attempt<'_>,
    ) -> Result<(), ApiError> {
        Self::reserve_in(connection, email_buckets(attempt)).await
    }

    pub async fn check_mfa(&self, attempt: &Attempt<'_>) -> Result<(), ApiError> {
        let (tenant, email, network) = dimensions(attempt);
        self.reserve([
            (
                format!("mfa-network:{tenant}:{network}"),
                &MFA_PER_CLIENT_IP,
            ),
            (format!("mfa-account:{tenant}:{email}"), &MFA_PER_ACCOUNT),
        ])
        .await
    }

    pub async fn check_redemption(&self, tenant: Uuid, client: IpAddr) -> Result<(), ApiError> {
        self.reserve([(
            format!("redemption:{tenant}:{}", client_network(client)),
            &TOKEN_REDEMPTION_PER_CLIENT_IP,
        )])
        .await
    }

    pub async fn check_profile(&self, tenant: Uuid, user: Uuid) -> Result<(), ApiError> {
        self.reserve([(
            format!("profile:{tenant}:{user}"),
            &PROFILE_UPDATE_PER_ACCOUNT,
        )])
        .await
    }

    pub async fn check_avatar(&self, tenant: Uuid, user: Uuid) -> Result<(), ApiError> {
        self.reserve([(
            format!("avatar:{tenant}:{user}"),
            &AVATAR_CHANGE_PER_ACCOUNT,
        )])
        .await
    }

    /// An entire bundle is reserved or rolled back. Order the row locks by hash so overlapping
    /// bundles from different endpoints cannot deadlock.
    async fn reserve<const N: usize>(&self, quotas: [Bucket; N]) -> Result<(), ApiError> {
        let mut transaction = self.0.begin().await?;
        Self::reserve_in(&mut transaction, quotas).await?;
        transaction.commit().await?;

        Ok(())
    }

    async fn reserve_in<const N: usize>(
        connection: &mut PgConnection,
        quotas: [Bucket; N],
    ) -> Result<(), ApiError> {
        let mut keys = Vec::with_capacity(N);
        let mut periods = Vec::with_capacity(N);
        let mut bursts = Vec::with_capacity(N);

        for (name, quota) in quotas {
            keys.push(hash_opaque_token(&name).to_vec());
            periods.push(
                i64::try_from(quota.replenish_every.as_millis()).map_err(ApiError::internal)?,
            );
            bursts.push(i64::from(quota.burst));
        }

        let retry = sqlx::query_scalar::<_, Option<i64>>(RESERVE_QUOTAS)
            .bind(keys)
            .bind(periods)
            .bind(bursts)
            .fetch_one(connection)
            .await?;

        if let Some(retry_ms) = retry {
            return Err(ApiError::RateLimited(Duration::from_millis(
                retry_ms.unsigned_abs(),
            )));
        }

        Ok(())
    }
}

fn email_buckets(attempt: &Attempt<'_>) -> [Bucket; 4] {
    let (tenant, email, network) = dimensions(attempt);
    [
        (
            format!("email-network:{tenant}:{network}"),
            &EMAIL_PER_CLIENT_IP,
        ),
        (
            format!("email-account:{tenant}:{email}"),
            &EMAIL_PER_ADDRESS,
        ),
        (format!("email-recipient:{email}"), &EMAIL_PER_RECIPIENT),
        (format!("email-project:{tenant}"), &EMAIL_PER_PROJECT),
    ]
}

fn dimensions(attempt: &Attempt<'_>) -> (Uuid, String, IpAddr) {
    (
        attempt.tenant_id,
        attempt.email.trim().to_lowercase(),
        client_network(attempt.client_ip),
    )
}

const RESERVE_QUOTAS: &str = "
    WITH tick AS MATERIALIZED (
        SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now_ms
    ), requested AS MATERIALIZED (
        SELECT * FROM unnest($1::bytea[], $2::bigint[], $3::bigint[]) AS input(bucket, period, burst)
    ), changed AS (
        INSERT INTO auth_rate_limits (bucket, ready_at_ms)
        SELECT bucket, now_ms + period FROM requested CROSS JOIN tick ORDER BY bucket
        ON CONFLICT (bucket) DO UPDATE SET
            ready_at_ms = GREATEST(auth_rate_limits.ready_at_ms,
                (SELECT now_ms FROM tick)) + (SELECT period FROM requested WHERE bucket = EXCLUDED.bucket)
        WHERE auth_rate_limits.ready_at_ms <= (SELECT now_ms FROM tick) +
            (SELECT period * (burst - 1) FROM requested WHERE bucket = EXCLUDED.bucket)
        RETURNING bucket
    )
    SELECT max(period) FROM requested LEFT JOIN changed USING (bucket) WHERE changed.bucket IS NULL
";

pub async fn prune_auth_quotas(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM auth_rate_limits WHERE bucket IN (
            SELECT bucket FROM auth_rate_limits
            WHERE ready_at_ms <= floor(extract(epoch FROM statement_timestamp()) * 1000)::bigint
            ORDER BY ready_at_ms LIMIT 2000 FOR UPDATE SKIP LOCKED
         )",
    )
    .execute(pool)
    .await?;

    Ok(())
}
