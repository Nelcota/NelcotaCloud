use sqlx::PgConnection;

use crate::modules::database::schema::schema_model::{CatalogSnapshot, SchemaModel};

/// One round trip: Postgres builds the whole description of `public` as JSON. Types are written
/// without modifiers (`format_type(oid, -1)`: `bpchar`, not `character`, which casts to
/// `char(1)`), so values cast to them keep their length.
const INTROSPECT_PUBLIC_SCHEMA: &str = "
SELECT json_build_object(
    'tables', coalesce((
        SELECT json_agg(json_build_object(
            'name', c.relname,
            'columns', coalesce((
                SELECT json_agg(json_build_object(
                    'name', a.attname,
                    'type', format_type(a.atttypid, -1)
                ) ORDER BY a.attnum)
                FROM pg_attribute a
                WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
            ), '[]'),
            'primary_key', coalesce((
                SELECT json_agg(a.attname ORDER BY k.ordinality)
                FROM pg_constraint pk
                CROSS JOIN LATERAL unnest(pk.conkey) WITH ORDINALITY AS k(attnum, ordinality)
                JOIN pg_attribute a ON a.attrelid = pk.conrelid AND a.attnum = k.attnum
                WHERE pk.conrelid = c.oid AND pk.contype = 'p'
            ), '[]')
        ) ORDER BY c.relname)
        FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
            AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    ), '[]'),
    'foreign_keys', coalesce((
        SELECT json_agg(json_build_object(
            'name', fk.conname,
            'table', source.relname,
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
        JOIN pg_class source ON source.oid = fk.conrelid
        JOIN pg_class target ON target.oid = fk.confrelid
        WHERE fk.contype = 'f'
            AND source.relnamespace = 'public'::regnamespace
            AND target.relnamespace = 'public'::regnamespace
    ), '[]'),
    'functions', coalesce((
        SELECT json_agg(json_build_object(
            'name', p.proname,
            'returns_set', p.proretset,
            'return_type', format_type(p.prorettype, -1),
            'default_count', p.pronargdefaults,
            'arguments', coalesce((
                SELECT json_agg(json_build_object(
                    'name', coalesce(names.name, ''),
                    'type', format_type(types.type_oid, -1)
                ) ORDER BY types.position)
                FROM unnest(coalesce(p.proallargtypes, p.proargtypes::oid[]))
                    WITH ORDINALITY AS types(type_oid, position)
                LEFT JOIN unnest(p.proargmodes) WITH ORDINALITY AS modes(mode, position)
                    USING (position)
                LEFT JOIN unnest(p.proargnames) WITH ORDINALITY AS names(name, position)
                    USING (position)
                WHERE coalesce(modes.mode, 'i') IN ('i', 'b', 'v')
            ), '[]')
        ) ORDER BY p.proname)
        FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace
            AND p.prokind = 'f'
            AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
    ), '[]')
)::text
";

#[derive(Debug, thiserror::Error)]
pub enum IntrospectionError {
    #[error("failed to read the schema: {0}")]
    Database(#[from] sqlx::Error),
    #[error("the schema description has an unexpected shape: {0}")]
    Shape(#[from] serde_json::Error),
}

/// Reads the project's `public` schema from the catalog (readable by every role).
pub async fn introspect_public_schema(
    connection: &mut PgConnection,
) -> Result<SchemaModel, IntrospectionError> {
    let description: String = sqlx::query_scalar(INTROSPECT_PUBLIC_SCHEMA)
        .fetch_one(connection)
        .await?;
    let snapshot: CatalogSnapshot = serde_json::from_str(&description)?;

    Ok(SchemaModel::new(snapshot))
}
