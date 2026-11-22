use crate::support::{TestResult, TestServer, unique_email};
use server::modules::auth::session::auth_retention::prune_expired_auth;

#[tokio::test]
async fn removes_expired_auth_rows_and_preserves_monthly_activity_and_latest_login() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server
        .sign_up(&tenant, &unique_email("auth-retention"))
        .await?;
    let pool = server.tenant_fixture_pool(&tenant).await?;
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, family_started_at, created_at)
         VALUES (gen_random_uuid(), $1, gen_random_uuid(), 'old_test_token'::bytea,
                 now() - interval '3 months', now() - interval '4 months', now() - interval '4 months'),
                (gen_random_uuid(), $1, gen_random_uuid(), 'recent_test_token'::bytea,
                 now() - interval '1 minute', now(), now())",
    )
    .bind(session.user.id)
    .execute(&pool)
    .await?;
    sqlx::query(
        "INSERT INTO mfa_challenges (token_hash, user_id, expires_at)
         VALUES ('old_test_challenge'::bytea, $1, now() - interval '1 day')",
    )
    .bind(session.user.id)
    .execute(&pool)
    .await?;
    sqlx::query(
        "INSERT INTO pending_magic_links (token_hash, email, expires_at)
         VALUES ('old_test_link'::bytea, 'unused@example.com', now() - interval '1 day')",
    )
    .execute(&pool)
    .await?;

    prune_expired_auth(&pool).await?;
    let retained: (i64, i64, i64, bool) = sqlx::query_as(
        "SELECT (SELECT count(*) FROM refresh_tokens),
                (SELECT count(*) FROM mfa_challenges),
                (SELECT count(*) FROM pending_magic_links),
                (SELECT last_sign_in_at IS NOT NULL FROM users WHERE id = $1)",
    )
    .bind(session.user.id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(retained, (2, 0, 0, true));
    pool.close().await;

    server.drop_tenant(&tenant).await
}
