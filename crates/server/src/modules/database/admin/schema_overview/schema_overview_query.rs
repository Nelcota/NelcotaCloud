use sqlx::PgConnection;

use crate::modules::database::admin::schema_overview::schema_overview_view::SchemaOverview;

/// Request roles appear in policies without the platform prefix (`anon`, `authenticated`).
const OVERVIEW: &str = "
SELECT json_build_object(
    'tables', coalesce((
        SELECT json_agg(json_build_object(
            'name', c.relname,
            'kind', CASE c.relkind
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized_view'
                WHEN 'f' THEN 'foreign_table'
                ELSE 'table' END,
            'rls_enabled', c.relrowsecurity,
            'estimated_rows', CASE WHEN c.reltuples < 0 THEN NULL ELSE c.reltuples::bigint END,
            'size_bytes', pg_total_relation_size(c.oid),
            'columns', coalesce((
                SELECT json_agg(json_build_object(
                    'name', a.attname,
                    'type', format_type(a.atttypid, a.atttypmod),
                    'nullable', NOT a.attnotnull,
                    'default', pg_get_expr(d.adbin, d.adrelid),
                    'is_identity', a.attidentity <> '',
                    'is_primary_key', EXISTS (
                        SELECT 1 FROM pg_constraint k
                        WHERE k.conrelid = c.oid AND k.contype = 'p' AND a.attnum = ANY (k.conkey)
                    ),
                    'is_unique', EXISTS (
                        SELECT 1 FROM pg_constraint k
                        WHERE k.conrelid = c.oid AND k.contype = 'u' AND k.conkey = ARRAY[a.attnum]
                    )
                ) ORDER BY a.attnum)
                FROM pg_attribute a
                LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
            ), '[]'),
            'foreign_keys', coalesce((
                SELECT json_agg(json_build_object(
                    'name', fk.conname,
                    'columns', (
                        SELECT json_agg(a.attname ORDER BY k.ordinality)
                        FROM unnest(fk.conkey) WITH ORDINALITY AS k(attnum, ordinality)
                        JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = k.attnum
                    ),
                    'foreign_table', target.relname,
                    'foreign_columns', (
                        SELECT json_agg(a.attname ORDER BY k.ordinality)
                        FROM unnest(fk.confkey) WITH ORDINALITY AS k(attnum, ordinality)
                        JOIN pg_attribute a ON a.attrelid = fk.confrelid AND a.attnum = k.attnum
                    )
                ) ORDER BY fk.conname)
                FROM pg_constraint fk
                JOIN pg_class target ON target.oid = fk.confrelid
                WHERE fk.conrelid = c.oid AND fk.contype = 'f'
            ), '[]'),
            'indexes', coalesce((
                SELECT json_agg(json_build_object(
                    'name', ic.relname,
                    'columns', (
                        SELECT json_agg(pg_get_indexdef(i.indexrelid, n, true) ORDER BY n)
                        FROM generate_series(1, i.indnkeyatts) AS n
                    ),
                    'method', am.amname,
                    'is_primary', i.indisprimary,
                    'is_unique', i.indisunique,
                    'size_bytes', pg_relation_size(i.indexrelid),
                    'scans', coalesce(stats.idx_scan, 0),
                    'definition', pg_get_indexdef(i.indexrelid)
                ) ORDER BY i.indisprimary DESC, ic.relname)
                FROM pg_index i
                JOIN pg_class ic ON ic.oid = i.indexrelid
                JOIN pg_am am ON am.oid = ic.relam
                LEFT JOIN pg_stat_user_indexes stats ON stats.indexrelid = i.indexrelid
                WHERE i.indrelid = c.oid
            ), '[]'),
            'policies', coalesce((
                SELECT json_agg(json_build_object(
                    'name', p.polname,
                    'command', CASE p.polcmd
                        WHEN 'r' THEN 'select'
                        WHEN 'a' THEN 'insert'
                        WHEN 'w' THEN 'update'
                        WHEN 'd' THEN 'delete'
                        ELSE 'all' END,
                    'roles', coalesce((
                        SELECT json_agg(CASE WHEN role_id = 0 THEN 'public'
                            ELSE regexp_replace(pg_get_userbyid(role_id), '^nelcota_', '') END)
                        FROM unnest(p.polroles) AS role_id
                    ), '[]'),
                    'using', pg_get_expr(p.polqual, p.polrelid),
                    'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
                ) ORDER BY p.polname)
                FROM pg_policy p
                WHERE p.polrelid = c.oid
            ), '[]')
        ) ORDER BY c.relname)
        FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    ), '[]'),
    'functions', coalesce((
        SELECT json_agg(json_build_object(
            'name', p.proname,
            'arguments', pg_get_function_arguments(p.oid),
            'returns', pg_get_function_result(p.oid)
        ) ORDER BY p.proname)
        FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace
            AND p.prokind = 'f'
            AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
    ), '[]')
)::text
";

#[derive(Debug, thiserror::Error)]
pub enum SchemaOverviewError {
    #[error("failed to read the schema: {0}")]
    Database(#[from] sqlx::Error),
    #[error("the schema description has an unexpected shape: {0}")]
    Shape(#[from] serde_json::Error),
}

/// Reads the catalog through the project's developer session, never as the platform's superuser.
///
/// The query calls unqualified functions, and `public` (on the search path, so
/// `auth.uid()` prints qualified) belongs to the project, which could shadow them.
pub async fn read_schema_overview(
    connection: &mut PgConnection,
) -> Result<SchemaOverview, SchemaOverviewError> {
    let description: String = sqlx::query_scalar(OVERVIEW).fetch_one(connection).await?;

    Ok(serde_json::from_str(&description)?)
}
