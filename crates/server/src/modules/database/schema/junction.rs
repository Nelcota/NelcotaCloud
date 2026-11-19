use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{
    ForeignKeyConstraints, ForeignKeyModel, SchemaModel,
};

/// A table linking two others many-to-many (`post_tags` with keys to `posts` and `tags`).
#[derive(Debug, PartialEq, Eq)]
pub struct Junction<'a> {
    pub table: &'a str,
    /// `(column of the junction, column of the parent table)` pairs.
    pub parent_pairs: Vec<(&'a str, &'a str)>,
    /// `(column of the junction, column of the embedded table)` pairs.
    pub target_pairs: Vec<(&'a str, &'a str)>,
}

/// The single table with one foreign key to `source` and another to `target`. `hint` (the
/// junction's name or one of its keys) picks one when there are several.
pub fn find_junction<'a>(
    schema: &'a SchemaModel,
    source: &str,
    target: &str,
    hint: Option<&str>,
) -> Result<Option<Junction<'a>>, DatabaseRejection> {
    let mut junctions = schema
        .referencing_tables(source)
        .into_iter()
        .flatten()
        .filter(|(table, _)| table.as_str() != source && table.as_str() != target)
        .filter_map(|(table, sources)| Some((sources, schema.foreign_keys_between(table, target)?)))
        .flat_map(|(sources, targets)| {
            sources.values().flat_map(move |source_key| {
                matching_targets(targets, source_key, hint)
                    .map(move |target_key| (source_key, target_key))
            })
        });
    let (to_source, to_target) = match junctions.next() {
        Some((to_source, to_target)) => (to_source, to_target),
        None => return Ok(None),
    };

    if junctions.next().is_some() {
        return Err(DatabaseRejection::AmbiguousRelationship(
            source.to_owned(),
            target.to_owned(),
        ));
    }

    Ok(Some(Junction {
        table: &to_source.table,
        parent_pairs: pairs(to_source),
        target_pairs: pairs(to_target),
    }))
}

fn matching_targets<'a>(
    targets: &'a ForeignKeyConstraints,
    source: &'a ForeignKeyModel,
    hint: Option<&str>,
) -> impl Iterator<Item = &'a ForeignKeyModel> + use<'a> {
    let (all_targets, selected) = match hint {
        Some(hint) if source.table != hint && source.name != hint => (None, targets.get(hint)),
        _ => (Some(targets), None),
    };

    all_targets
        .into_iter()
        .flat_map(|keys| keys.values())
        .chain(selected)
        .filter(move |target| target.name != source.name)
}

fn pairs(foreign_key: &ForeignKeyModel) -> Vec<(&str, &str)> {
    foreign_key
        .columns
        .iter()
        .map(String::as_str)
        .zip(foreign_key.foreign_columns.iter().map(String::as_str))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::database::schema::schema_model::CatalogSnapshot;

    fn key(name: &str, table: &str, column: &str, foreign_table: &str) -> ForeignKeyModel {
        ForeignKeyModel {
            name: name.to_owned(),
            table: table.to_owned(),
            columns: vec![column.to_owned()],
            foreign_table: foreign_table.to_owned(),
            foreign_columns: vec!["id".to_owned()],
        }
    }

    fn schema(foreign_keys: Vec<ForeignKeyModel>) -> SchemaModel {
        SchemaModel::new(CatalogSnapshot {
            tables: Vec::new(),
            foreign_keys,
            functions: Vec::new(),
        })
    }

    #[test]
    fn finds_the_table_linking_both_sides() -> Result<(), DatabaseRejection> {
        let schema = schema(vec![
            key("post_tags_post_fkey", "post_tags", "post_id", "posts"),
            key("post_tags_tag_fkey", "post_tags", "tag_id", "tags"),
        ]);

        let junction = find_junction(&schema, "posts", "tags", None)?;

        assert_eq!(
            junction,
            Some(Junction {
                table: "post_tags",
                parent_pairs: vec![("post_id", "id")],
                target_pairs: vec![("tag_id", "id")],
            })
        );
        Ok(())
    }

    #[test]
    fn several_junctions_need_a_hint() -> Result<(), DatabaseRejection> {
        let schema = schema(vec![
            key("likes_post_fkey", "likes", "post_id", "posts"),
            key("likes_user_fkey", "likes", "user_id", "users"),
            key("saves_post_fkey", "saves", "post_id", "posts"),
            key("saves_user_fkey", "saves", "user_id", "users"),
        ]);

        assert!(find_junction(&schema, "posts", "users", None).is_err());
        let saves = find_junction(&schema, "posts", "users", Some("saves"))?;
        assert_eq!(saves.map(|junction| junction.table), Some("saves"));
        assert_eq!(find_junction(&schema, "posts", "tags", None)?, None);
        Ok(())
    }
}
