WITH active_overdue AS (
    SELECT overdue.next_attempt_at
    FROM unnest($1::uuid[]) AS endpoint(id)
    CROSS JOIN LATERAL (
        SELECT delivery.next_attempt_at
        FROM webhook_deliveries delivery
        WHERE delivery.endpoint_id = endpoint.id
          AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL
          AND delivery.next_attempt_at <= statement_timestamp()
          AND (delivery.lease_expires_at IS NULL OR delivery.lease_expires_at <= statement_timestamp())
        ORDER BY delivery.next_attempt_at
        LIMIT $2
    ) overdue
), oldest_overdue AS (
    SELECT min(oldest.next_attempt_at) AS next_attempt_at
    FROM unnest($1::uuid[]) AS endpoint(id)
    CROSS JOIN LATERAL (
        SELECT delivery.next_attempt_at
        FROM webhook_deliveries delivery
        WHERE delivery.endpoint_id = endpoint.id
          AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL
          AND delivery.next_attempt_at <= statement_timestamp()
          AND (delivery.lease_expires_at IS NULL OR delivery.lease_expires_at <= statement_timestamp())
        ORDER BY delivery.next_attempt_at
        LIMIT 1
    ) oldest
)
SELECT statement_timestamp() AS observed_at,
       (SELECT count(*) FROM (
            SELECT 1 FROM webhook_deliveries
            WHERE delivered_at IS NULL AND failed_at IS NULL
            ORDER BY next_attempt_at LIMIT $2
        ) pending) AS pending,
       (SELECT count(*) FROM (SELECT 1 FROM active_overdue LIMIT $2) overdue) AS overdue,
       (SELECT floor(extract(epoch FROM statement_timestamp() - next_attempt_at))::bigint
        FROM oldest_overdue) AS oldest_overdue_seconds,
       (SELECT count(*) FROM (
            SELECT 1 FROM webhook_deliveries
            WHERE failed_at >= statement_timestamp() - interval '24 hours'
              AND last_error IS DISTINCT FROM $3::text
            ORDER BY failed_at DESC LIMIT $2
        ) failed) AS failed_last_day
