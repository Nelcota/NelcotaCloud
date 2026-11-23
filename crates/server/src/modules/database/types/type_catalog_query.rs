use sqlx::PgConnection;

use crate::modules::database::types::type_catalog::TypeCatalog;

/// One static query. `value_types` describes every type once: its element's name (domains
/// resolved one level), whether it is an array or an enum of `public`, and the relation of
/// `public` whose rows it is; the sections below look types up there by oid.
const TYPE_CATALOG: &str = "
WITH value_types AS (
    SELECT outer_type.oid, json_build_object(
        'name', base.typname,
        'is_array', outer_type.typcategory = 'A',
        'is_enum', base.typtype = 'e' AND base.typnamespace = 'public'::regnamespace,
        'relation', (
            SELECT r.relname FROM pg_class r
            WHERE r.oid = base.typrelid AND r.relnamespace = 'public'::regnamespace
        )
    ) AS value
    FROM pg_type outer_type
    JOIN pg_type element ON element.oid = CASE
        WHEN outer_type.typcategory = 'A' THEN outer_type.typelem ELSE outer_type.oid END
    JOIN pg_type base ON base.oid = CASE
        WHEN element.typtype = 'd' THEN element.typbasetype ELSE element.oid END
)
SELECT json_build_object(
    'relations', (
        SELECT coalesce(json_agg(json_build_object(
            'name', c.relname,
            'is_view', c.relkind IN ('v', 'm'),
            'columns', coalesce((
                SELECT json_agg(json_build_object(
                    'name', a.attname,
                    'type', (SELECT v.value FROM value_types v WHERE v.oid = a.atttypid),
                    'nullable', NOT a.attnotnull,
                    'has_default', a.atthasdef OR a.attidentity <> '',
                    'is_generated', a.attgenerated <> ''
                ) ORDER BY a.attnum)
                FROM pg_attribute a
                WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
            ), '[]')
        ) ORDER BY c.relname), '[]')
        FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    ),
    'enums', (
        SELECT coalesce(json_agg(json_build_object(
            'name', t.typname,
            'labels', coalesce((
                SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder)
                FROM pg_enum e WHERE e.enumtypid = t.oid
            ), '[]')
        ) ORDER BY t.typname), '[]')
        FROM pg_type t
        WHERE t.typnamespace = 'public'::regnamespace AND t.typtype = 'e'
    ),
    -- Only input arguments are named in rpc; the defaults are the last pronargdefaults of them.
    'functions', (
        SELECT coalesce(json_agg(json_build_object(
            'name', p.proname,
            'arguments', coalesce((
                SELECT json_agg(json_build_object(
                    'name', coalesce(p.proargnames[argument.position::int], ''),
                    'type', (SELECT v.value FROM value_types v WHERE v.oid = argument.type_oid),
                    'has_default', argument.position > p.pronargs - p.pronargdefaults
                ) ORDER BY argument.position)
                FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS argument(type_oid, position)
            ), '[]'),
            'returns', (SELECT v.value FROM value_types v WHERE v.oid = p.prorettype),
            'returns_set', p.proretset
        ) ORDER BY p.proname, p.oid), '[]')
        FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace
            AND p.prokind = 'f'
            AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
    )
)::text
";

#[derive(Debug, thiserror::Error)]
pub enum TypeCatalogError {
    #[error("failed to read the schema types: {0}")]
    Database(#[from] sqlx::Error),
    #[error("the schema types have an unexpected shape: {0}")]
    Shape(#[from] serde_json::Error),
}

/// Reads the catalog through the project's developer session, never as the platform's superuser.
pub async fn read_type_catalog(
    connection: &mut PgConnection,
) -> Result<TypeCatalog, TypeCatalogError> {
    let description: String = sqlx::query_scalar(TYPE_CATALOG)
        .fetch_one(connection)
        .await?;

    Ok(serde_json::from_str(&description)?)
}
