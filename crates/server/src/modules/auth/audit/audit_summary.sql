WITH scoped_events AS NOT MATERIALIZED (
    SELECT action, user_id, ip_address, email, occurred_at FROM audit_events
    WHERE occurred_at >= $1::timestamptz
      AND ($2::timestamptz IS NULL OR occurred_at < $2)
), index_visibility AS MATERIALIZED (
    -- With few all-visible pages, one heap scan costs less than a totals scan and a login scan.
    -- Use the current relation size so bulk appends count before the next catalog update.
    SELECT relallvisible > 0 AND
           relallvisible::bigint * current_setting('block_size')::bigint * 2 >= pg_relation_size(oid)
           AS prefer_index
    FROM pg_class WHERE oid = 'auth.audit_events'::regclass
), heap_counts AS (
    SELECT count(*) FILTER (WHERE action = 'logged_in') AS logins,
           count(*) FILTER (WHERE action = 'login_failed') AS failures,
           count(*) FILTER (WHERE action = ANY($3)) AS changes,
           count(DISTINCT user_id) FILTER (WHERE action = 'logged_in') AS active_users
    FROM scoped_events
), other_totals AS (
    SELECT count(*) FILTER (WHERE action = 'logged_in') AS anonymous_logins,
           count(*) FILTER (WHERE action = 'login_failed') AS failures,
           count(*) FILTER (WHERE action = ANY($3)) AS changes
    FROM scoped_events
    WHERE action IS DISTINCT FROM 'logged_in' OR user_id IS NULL
), active_accounts AS (
    -- Each account's group also supplies its login count without reading those events twice.
    SELECT count(*) AS active_users, COALESCE(sum(logins), 0)::bigint AS identified_logins
    FROM (
        SELECT user_id, count(*) AS logins FROM scoped_events
        WHERE action = 'logged_in' AND user_id IS NOT NULL
        GROUP BY user_id ORDER BY user_id
    ) AS accounts
), counts AS (
    SELECT other_totals.anonymous_logins + active_accounts.identified_logins AS logins,
           other_totals.failures,
           other_totals.changes + CASE WHEN 'logged_in' = ANY($3)
                                       THEN active_accounts.identified_logins ELSE 0 END AS changes,
           active_accounts.active_users
    FROM other_totals CROSS JOIN active_accounts
    WHERE (SELECT prefer_index FROM index_visibility)
    UNION ALL
    SELECT logins, failures, changes, active_users FROM heap_counts
    WHERE (SELECT NOT prefer_index FROM index_visibility)
), failures AS NOT MATERIALIZED (
    SELECT ip_address, email, occurred_at FROM scoped_events
    WHERE action = 'login_failed' AND ip_address IS NOT NULL
), top_addresses AS MATERIALIZED (
    SELECT ip_address, count(*) AS failures, max(occurred_at) AS last_seen_at FROM failures
    GROUP BY ip_address ORDER BY failures DESC, last_seen_at DESC LIMIT $4
)
SELECT counts.*, COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
        'ip_address', top.ip_address, 'failures', top.failures,
        'accounts', accounts.total, 'last_seen_at', top.last_seen_at
    ) ORDER BY top.failures DESC, top.last_seen_at DESC)
    FROM top_addresses AS top
    CROSS JOIN LATERAL (
        SELECT count(DISTINCT email) AS total FROM failures WHERE ip_address = top.ip_address
    ) AS accounts
), '[]'::jsonb) AS failing_addresses
FROM counts
