-- The usage query projects user IDs from each date range, so it can reuse the
-- index for both the range scan and the IDs it counts.
CREATE INDEX refresh_tokens_usage_idx ON refresh_tokens (created_at) INCLUDE (user_id);
DROP INDEX refresh_tokens_created_at_idx;
