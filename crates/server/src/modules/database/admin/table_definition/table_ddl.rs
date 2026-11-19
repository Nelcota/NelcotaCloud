use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::database::admin::table_definition::column_definition::ColumnDefinition;
use crate::modules::database::admin::table_definition::object_name::ObjectName;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const MAX_COLUMNS: usize = 100;

/// A table to create in the project's `public` schema. It starts with row level security on
/// (the database does it for every new table): add policies to open it.
#[derive(Debug, Deserialize, ToSchema, Validate)]
pub struct CreateTableRequest {
    #[validate(length(min = 1, max = 63))]
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
}

/// `CREATE TABLE public."t" (<columns>, PRIMARY KEY (...))`.
pub fn create_table_sql(request: &CreateTableRequest) -> Result<String, DatabaseRejection> {
    let table = parse_name(&request.name)?;
    let columns = &request.columns;

    if columns.is_empty() || columns.len() > MAX_COLUMNS {
        return Err(DatabaseRejection::invalid_query(
            "a table has between 1 and 100 columns",
        ));
    }

    let mut parts = columns
        .iter()
        .map(ColumnDefinition::to_sql)
        .collect::<Result<Vec<_>, _>>()?;
    let primary_key = columns
        .iter()
        .filter(|column| column.primary_key)
        .map(|column| parse_name(&column.name).map(|name| name.quoted()))
        .collect::<Result<Vec<_>, _>>()?;

    if primary_key.is_empty() == false {
        parts.push(format!("PRIMARY KEY ({})", primary_key.join(", ")));
    }

    let mut statements = format!("CREATE TABLE {} ({})", table.in_public(), parts.join(", "));
    let leading_key = primary_key.first();
    for column in columns {
        statements.push_str(&foreign_key_index_sql(&table, column, leading_key)?);
    }

    Ok(statements)
}

pub fn drop_table_sql(table: &str) -> Result<String, DatabaseRejection> {
    Ok(format!("DROP TABLE {}", parse_name(table)?.in_public()))
}

pub fn add_column_sql(table: &str, column: &ColumnDefinition) -> Result<String, DatabaseRejection> {
    if column.primary_key {
        return Err(DatabaseRejection::invalid_query(
            "the primary key is chosen when the table is created",
        ));
    }

    let table = parse_name(table)?;
    let mut statements = format!(
        "ALTER TABLE {} ADD COLUMN {}",
        table.in_public(),
        column.to_sql()?
    );
    statements.push_str(&foreign_key_index_sql(&table, column, None)?);

    Ok(statements)
}

fn foreign_key_index_sql(
    table: &ObjectName,
    column: &ColumnDefinition,
    leading_key: Option<&String>,
) -> Result<String, DatabaseRejection> {
    if column.references.is_none() || column.unique {
        return Ok(String::new());
    }

    let name = parse_name(&column.name)?.quoted();

    if leading_key == Some(&name) {
        return Ok(String::new());
    }

    Ok(format!("; CREATE INDEX ON {} ({name})", table.in_public()))
}

pub fn drop_column_sql(table: &str, column: &str) -> Result<String, DatabaseRejection> {
    Ok(format!(
        "ALTER TABLE {} DROP COLUMN {}",
        parse_name(table)?.in_public(),
        parse_name(column)?.quoted()
    ))
}

/// Turning row level security off opens the table to every request role's privileges.
pub fn row_level_security_sql(table: &str, is_enabled: bool) -> Result<String, DatabaseRejection> {
    let action = match is_enabled {
        true => "ENABLE",
        false => "DISABLE",
    };

    Ok(format!(
        "ALTER TABLE {} {action} ROW LEVEL SECURITY",
        parse_name(table)?.in_public()
    ))
}

pub fn parse_name(text: &str) -> Result<ObjectName, DatabaseRejection> {
    ObjectName::parse(text).map_err(DatabaseRejection::invalid_query)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn creates_a_table_with_a_composite_primary_key() -> Result<(), Box<dyn std::error::Error>> {
        let request: CreateTableRequest = serde_json::from_value(json!({
            "name": "memberships",
            "columns": [
                { "name": "team_id", "type": "bigint", "primary_key": true },
                { "name": "user_id", "type": "uuid", "primary_key": true },
                { "name": "role", "type": "text", "default": "member" }
            ]
        }))?;

        assert_eq!(
            create_table_sql(&request)?,
            "CREATE TABLE public.\"memberships\" (\"team_id\" bigint NOT NULL, \
             \"user_id\" uuid NOT NULL, \"role\" text NOT NULL DEFAULT 'member', \
             PRIMARY KEY (\"team_id\", \"user_id\"))"
        );
        Ok(())
    }

    #[test]
    fn refuses_tables_without_columns_and_bad_names() {
        let empty = CreateTableRequest {
            name: "empty".to_owned(),
            columns: Vec::new(),
        };

        assert!(create_table_sql(&empty).is_err());
        assert!(drop_table_sql("x; DROP TABLE y").is_err());
        assert!(row_level_security_sql("Posts", true).is_err());
    }
}
