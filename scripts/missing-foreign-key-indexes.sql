-- Run on a project database. Review the generated statements before executing them.
SELECT
    relation.relname AS table_name,
    foreign_key.conname AS constraint_name,
    format(
        'CREATE INDEX%s ON %I.%I (%s);',
        CASE WHEN relation.relkind = 'r' THEN ' CONCURRENTLY' END,
        namespace.nspname,
        relation.relname,
        columns.names
    ) AS create_index
FROM pg_constraint AS foreign_key
JOIN pg_class AS relation ON relation.oid = foreign_key.conrelid
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
CROSS JOIN LATERAL (
    SELECT string_agg(quote_ident(attribute.attname), ', ' ORDER BY key_column.position) AS names
    FROM unnest(foreign_key.conkey) WITH ORDINALITY AS key_column(number, position)
    JOIN pg_attribute AS attribute
        ON attribute.attrelid = relation.oid AND attribute.attnum = key_column.number
) AS columns
WHERE foreign_key.contype = 'f'
    AND foreign_key.conparentid = 0
    AND namespace.nspname = 'public'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_index AS existing_index
        JOIN pg_class AS index_relation ON index_relation.oid = existing_index.indexrelid
        JOIN pg_am AS access_method ON access_method.oid = index_relation.relam
        WHERE existing_index.indrelid = relation.oid
            AND existing_index.indisvalid
            AND existing_index.indpred IS NULL
            AND access_method.amname = 'btree'
            AND existing_index.indnkeyatts >= cardinality(foreign_key.conkey)
            AND foreign_key.conkey <@ (existing_index.indkey::smallint[])[0:cardinality(foreign_key.conkey) - 1]
    )
ORDER BY relation.relname, foreign_key.conname;
