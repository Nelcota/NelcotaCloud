use serde_json::{Map, Value};

use crate::modules::database::query::preferences::Resolution;
use crate::modules::database::query::read_query::MAX_ROWS;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::TableModel;
use crate::modules::database::sql::write_change::{ConflictAction, InsertBatch, UpdateValues};

/// An insert body: one object, or an array of up to `MAX_ROWS` objects. Rows setting the same
/// columns form one batch, so a column a row leaves out takes its default.
pub fn insert_batches(
    table: &TableModel,
    body: Value,
) -> Result<Vec<InsertBatch>, DatabaseRejection> {
    let mut batches: Vec<(Vec<String>, Vec<Value>)> = Vec::new();

    for row in insert_rows(body)? {
        let Value::Object(object) = row else {
            return Err(DatabaseRejection::invalid_query(
                "every row must be an object",
            ));
        };
        let columns = row_columns(table, &object)?;
        let row = Value::Object(object);

        match batches
            .iter_mut()
            .find(|(batch_columns, _)| *batch_columns == columns)
        {
            Some((_, rows)) => rows.push(row),
            None => batches.push((columns, vec![row])),
        }
    }

    Ok(batches
        .into_iter()
        .map(|(columns, rows)| InsertBatch {
            rows_json: Value::Array(rows).to_string(),
            columns,
            conflict: None,
        })
        .collect())
}

fn insert_rows(body: Value) -> Result<Vec<Value>, DatabaseRejection> {
    let rows = match body {
        Value::Array(rows) => rows,
        Value::Object(row) => vec![Value::Object(row)],
        _ => {
            return Err(DatabaseRejection::invalid_query(
                "send an object or an array of objects",
            ));
        }
    };

    if rows.is_empty() || rows.len() > usize::try_from(MAX_ROWS).unwrap_or(usize::MAX) {
        return Err(DatabaseRejection::invalid_query(
            "send between 1 and 1000 rows",
        ));
    }

    Ok(rows)
}

/// The row's keys, sorted, all columns of the table; a row must set at least one.
fn row_columns(
    table: &TableModel,
    object: &Map<String, Value>,
) -> Result<Vec<String>, DatabaseRejection> {
    let mut columns = Vec::new();
    add_columns(table, object, &mut columns)?;

    if columns.is_empty() {
        return Err(DatabaseRejection::invalid_query(
            "every row must set at least one column",
        ));
    }

    columns.sort();
    Ok(columns)
}

/// An update body: one object with at least one column.
pub fn update_values(table: &TableModel, body: Value) -> Result<UpdateValues, DatabaseRejection> {
    let Value::Object(values) = body else {
        return Err(DatabaseRejection::invalid_query(
            "send an object with the new values",
        ));
    };

    if values.is_empty() {
        return Err(DatabaseRejection::invalid_query(
            "send at least one column to change",
        ));
    }

    let mut columns = Vec::new();
    add_columns(table, &values, &mut columns)?;

    Ok(UpdateValues {
        values_json: Value::Object(values).to_string(),
        columns,
    })
}

/// Upserts match rows on `on_conflict` (or the primary key) and then merge or skip them.
pub fn conflict_action(
    table: &TableModel,
    on_conflict: Option<&[String]>,
    resolution: Resolution,
    inserted_columns: &[String],
) -> Result<ConflictAction, DatabaseRejection> {
    let target_columns = on_conflict.unwrap_or(&table.primary_key).to_vec();

    if target_columns.is_empty() {
        return Err(DatabaseRejection::invalid_query(
            "the table has no primary key: name the unique columns with on_conflict",
        ));
    }

    if let Some(unknown) = target_columns
        .iter()
        .find(|column| table.column(column).is_none())
    {
        return Err(DatabaseRejection::ColumnNotFound(unknown.clone()));
    }

    let updated_columns = match resolution {
        Resolution::IgnoreDuplicates => Vec::new(),
        Resolution::MergeDuplicates => inserted_columns
            .iter()
            .filter(|column| target_columns.contains(column) == false)
            .cloned()
            .collect(),
    };

    Ok(ConflictAction {
        target_columns,
        updated_columns,
    })
}

fn add_columns(
    table: &TableModel,
    object: &Map<String, Value>,
    columns: &mut Vec<String>,
) -> Result<(), DatabaseRejection> {
    for key in object.keys() {
        if table.column(key).is_none() {
            return Err(DatabaseRejection::ColumnNotFound(key.clone()));
        }

        if columns.contains(key) == false {
            columns.push(key.clone());
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::modules::database::schema::schema_model::ColumnModel;

    fn posts() -> TableModel {
        let column = |name: &str| ColumnModel {
            name: name.to_owned(),
            type_name: "text".to_owned(),
        };

        TableModel {
            name: "posts".to_owned(),
            columns: vec![column("id"), column("title"), column("body")],
            primary_key: vec!["id".to_owned()],
        }
    }

    #[test]
    fn groups_rows_by_the_columns_they_set() -> Result<(), DatabaseRejection> {
        let batches = insert_batches(
            &posts(),
            json!([{ "title": "a" }, { "title": "b", "body": "c" }, { "title": "d" }]),
        )?;
        let columns: Vec<&Vec<String>> = batches.iter().map(|batch| &batch.columns).collect();

        assert_eq!(
            columns,
            vec![
                &vec!["title".to_owned()],
                &vec!["body".to_owned(), "title".to_owned()]
            ]
        );
        Ok(())
    }

    #[test]
    fn refuses_unknown_columns_and_bad_shapes() {
        let table = posts();

        assert!(insert_batches(&table, json!({ "missing": 1 })).is_err());
        assert!(insert_batches(&table, json!([])).is_err());
        assert!(insert_batches(&table, json!([1])).is_err());
        assert!(insert_batches(&table, json!("x")).is_err());
        assert!(update_values(&table, json!({})).is_err());
        assert!(update_values(&table, json!([{ "title": "a" }])).is_err());
    }

    #[test]
    fn merges_every_column_but_the_conflict_target() -> Result<(), DatabaseRejection> {
        let inserted = vec!["id".to_owned(), "title".to_owned()];
        let merge = conflict_action(&posts(), None, Resolution::MergeDuplicates, &inserted)?;
        let ignore = conflict_action(&posts(), None, Resolution::IgnoreDuplicates, &inserted)?;

        assert_eq!(merge.target_columns, vec!["id".to_owned()]);
        assert_eq!(merge.updated_columns, vec!["title".to_owned()]);
        assert!(ignore.updated_columns.is_empty());
        Ok(())
    }
}
