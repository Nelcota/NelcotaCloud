-- Broad searches can fill a page near the cursor without scanning historical matches.
recent_events AS MATERIALIZED (
    SELECT id, user_id, email, ip_address FROM scoped_events ORDER BY id DESC LIMIT 256
), recent_matches AS MATERIALIZED (
    SELECT events.id FROM recent_events AS events LEFT JOIN users ON users.id = events.user_id
    WHERE COALESCE(users.email, events.email) LIKE $4 ESCAPE '\'
       OR events.ip_address LIKE $4 ESCAPE '\'
    ORDER BY events.id DESC LIMIT $5
), recent_page AS MATERIALIZED (
    SELECT count(*) = $5 AS is_full FROM recent_matches
), indexed_matches AS NOT MATERIALIZED (
    -- Every branch can contribute only one page. UNION removes overlapping matches.
    (SELECT events.id FROM scoped_events AS events JOIN users ON users.id = events.user_id
     WHERE users.email LIKE $4 ESCAPE '\'
     ORDER BY events.id DESC LIMIT $5)
    UNION
    (SELECT events.id FROM scoped_events AS events
     WHERE events.email LIKE $4 ESCAPE '\'
       AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = events.user_id)
     ORDER BY events.id DESC LIMIT $5)
    UNION
    (SELECT events.id FROM scoped_events AS events
     WHERE events.ip_address LIKE $4 ESCAPE '\'
     ORDER BY events.id DESC LIMIT $5)
), matched AS MATERIALIZED (
    SELECT id FROM recent_matches WHERE (SELECT is_full FROM recent_page)
    UNION ALL
    SELECT id FROM indexed_matches WHERE (SELECT is_full = false FROM recent_page)
)
