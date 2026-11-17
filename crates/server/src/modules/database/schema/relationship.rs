use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::junction::{Junction, find_junction};
use crate::modules::database::schema::schema_model::{ForeignKeyModel, SchemaModel, TableModel};

/// How an embedded table relates to the one it is embedded in, found from a foreign key.
pub struct Relationship<'a> {
    pub target: &'a TableModel,
    pub is_to_many: bool,
    /// `(column of the parent table, column of the embedded table)` pairs that must be equal.
    pub column_pairs: Vec<(&'a str, &'a str)>,
    /// Many-to-many through a linking table, when no key links the two tables directly.
    pub junction: Option<Junction<'a>>,
}

/// The single foreign key linking `source` and `target`, in either direction, or else the single
/// table linking both. `hint` (a constraint, column or junction name) picks one of several.
pub fn find_relationship<'a>(
    schema: &'a SchemaModel,
    source: &str,
    target: &str,
    hint: Option<&str>,
) -> Result<Relationship<'a>, DatabaseRejection> {
    let Some(target_table) = schema.table(target) else {
        return Err(DatabaseRejection::TableNotFound(target.to_owned()));
    };
    let mut candidates = schema
        .foreign_keys
        .iter()
        .flat_map(|foreign_key| candidates_of(foreign_key, source, target))
        .filter(|(foreign_key, _)| matches_hint(foreign_key, hint));
    let not_found =
        || DatabaseRejection::RelationshipNotFound(source.to_owned(), target.to_owned());
    let Some((foreign_key, is_to_many)) = candidates.next() else {
        let junction = find_junction(schema, source, target, hint)?;
        let Some(junction) = junction else {
            return Err(not_found());
        };
        return Ok(Relationship {
            target: target_table,
            is_to_many: true,
            column_pairs: Vec::new(),
            junction: Some(junction),
        });
    };

    if candidates.next().is_some() {
        return Err(DatabaseRejection::AmbiguousRelationship(
            source.to_owned(),
            target.to_owned(),
        ));
    }

    Ok(Relationship {
        target: target_table,
        is_to_many,
        column_pairs: column_pairs(foreign_key, is_to_many),
        junction: None,
    })
}

/// A key from `source` to `target` embeds one row; a key from `target` to `source`, many.
fn candidates_of<'a>(
    foreign_key: &'a ForeignKeyModel,
    source: &str,
    target: &str,
) -> Vec<(&'a ForeignKeyModel, bool)> {
    let mut candidates = Vec::new();

    if foreign_key.table == source && foreign_key.foreign_table == target {
        candidates.push((foreign_key, false));
    }

    if foreign_key.table == target && foreign_key.foreign_table == source {
        candidates.push((foreign_key, true));
    }

    candidates
}

fn matches_hint(foreign_key: &ForeignKeyModel, hint: Option<&str>) -> bool {
    let Some(hint) = hint else {
        return true;
    };

    foreign_key.name == hint || foreign_key.columns.iter().any(|column| column == hint)
}

fn column_pairs(foreign_key: &ForeignKeyModel, is_to_many: bool) -> Vec<(&str, &str)> {
    let referencing = foreign_key.columns.iter().map(String::as_str);
    let referenced = foreign_key.foreign_columns.iter().map(String::as_str);

    if is_to_many {
        return referenced.zip(referencing).collect();
    }

    referencing.zip(referenced).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::database::schema::schema_model::CatalogSnapshot;

    fn table(name: &str) -> TableModel {
        TableModel {
            name: name.to_owned(),
            columns: Vec::new(),
            primary_key: Vec::new(),
        }
    }

    fn key(name: &str, table: &str, column: &str, foreign_table: &str) -> ForeignKeyModel {
        ForeignKeyModel {
            name: name.to_owned(),
            table: table.to_owned(),
            columns: vec![column.to_owned()],
            foreign_table: foreign_table.to_owned(),
            foreign_columns: vec!["id".to_owned()],
        }
    }

    fn schema() -> SchemaModel {
        SchemaModel::new(CatalogSnapshot {
            tables: vec![table("posts"), table("authors"), table("comments")],
            foreign_keys: vec![
                key("posts_author_fkey", "posts", "author_id", "authors"),
                key("posts_editor_fkey", "posts", "editor_id", "authors"),
                key("comments_post_fkey", "comments", "post_id", "posts"),
            ],
            functions: Vec::new(),
        })
    }

    #[test]
    fn finds_to_one_and_to_many_relationships() -> Result<(), DatabaseRejection> {
        let schema = schema();
        let to_many = find_relationship(&schema, "posts", "comments", None)?;
        let to_one = find_relationship(&schema, "comments", "posts", None)?;

        assert!(to_many.is_to_many);
        assert_eq!(to_many.column_pairs, vec![("id", "post_id")]);
        assert!(to_one.is_to_many == false);
        assert_eq!(to_one.column_pairs, vec![("post_id", "id")]);
        Ok(())
    }

    #[test]
    fn a_hint_picks_one_of_several_keys() -> Result<(), DatabaseRejection> {
        let schema = schema();
        let ambiguous = find_relationship(&schema, "posts", "authors", None);
        let editor = find_relationship(&schema, "posts", "authors", Some("editor_id"))?;

        assert!(matches!(
            ambiguous,
            Err(DatabaseRejection::AmbiguousRelationship(..))
        ));
        assert_eq!(editor.column_pairs, vec![("editor_id", "id")]);
        Ok(())
    }

    #[test]
    fn unrelated_or_unknown_tables_are_refused() {
        let schema = schema();

        assert!(find_relationship(&schema, "authors", "comments", None).is_err());
        assert!(find_relationship(&schema, "posts", "missing", None).is_err());
    }
}
