use std::collections::HashMap;

use serde::Deserialize;

/// What the Data API knows of a project's `public` schema.
///
/// Tables, relationships between them and callable functions. Client-sent names are only ever looked up here, so every name that
/// reaches SQL is one the catalog listed.
pub struct SchemaModel {
    tables: HashMap<String, TableModel>,
    foreign_keys: HashMap<String, ReferencingTables>,
    functions: Vec<FunctionModel>,
}

pub(super) type ForeignKeyConstraints = HashMap<String, ForeignKeyModel>;
pub(super) type ReferencingTables = HashMap<String, ForeignKeyConstraints>;

/// The catalog's answer, exactly as the introspection query shapes it.
#[derive(Deserialize)]
pub struct CatalogSnapshot {
    pub tables: Vec<TableModel>,
    pub foreign_keys: Vec<ForeignKeyModel>,
    pub functions: Vec<FunctionModel>,
}

#[derive(Debug, Deserialize)]
pub struct TableModel {
    pub name: String,
    pub columns: Vec<ColumnModel>,
    pub primary_key: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ColumnModel {
    pub name: String,
    /// Written by Postgres (`format_type`), so it is valid, already quoted type syntax.
    #[serde(rename = "type")]
    pub type_name: String,
}

#[derive(Debug, Deserialize)]
pub struct ForeignKeyModel {
    pub name: String,
    pub table: String,
    pub columns: Vec<String>,
    pub foreign_table: String,
    pub foreign_columns: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct FunctionModel {
    pub name: String,
    pub returns_set: bool,
    pub return_type: String,
    pub arguments: Vec<ArgumentModel>,
    /// The last this many arguments have defaults.
    pub default_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct ArgumentModel {
    pub name: String,
    #[serde(rename = "type")]
    pub type_name: String,
}

impl SchemaModel {
    pub fn new(snapshot: CatalogSnapshot) -> Self {
        let tables = snapshot
            .tables
            .into_iter()
            .map(|table| (table.name.clone(), table))
            .collect();
        let mut foreign_keys = HashMap::<String, ReferencingTables>::new();
        for key in snapshot.foreign_keys {
            foreign_keys
                .entry(key.foreign_table.clone())
                .or_default()
                .entry(key.table.clone())
                .or_default()
                .insert(key.name.clone(), key);
        }

        Self {
            tables,
            foreign_keys,
            functions: snapshot.functions,
        }
    }

    pub fn table(&self, name: &str) -> Option<&TableModel> {
        self.tables.get(name)
    }

    pub(super) fn referencing_tables(&self, target: &str) -> Option<&ReferencingTables> {
        self.foreign_keys.get(target)
    }

    pub(super) fn foreign_keys_between(
        &self,
        source: &str,
        target: &str,
    ) -> Option<&ForeignKeyConstraints> {
        self.referencing_tables(target)?.get(source)
    }

    pub fn functions_named(&self, name: &str) -> Vec<&FunctionModel> {
        self.functions
            .iter()
            .filter(|function| function.name == name)
            .collect()
    }
}

impl TableModel {
    pub fn column(&self, name: &str) -> Option<&ColumnModel> {
        self.columns.iter().find(|column| column.name == name)
    }
}

impl FunctionModel {
    /// Arguments that must be given: those before the ones with defaults.
    pub fn required_arguments(&self) -> impl Iterator<Item = &ArgumentModel> {
        let required_count = self.arguments.len().saturating_sub(self.default_count);

        self.arguments.iter().take(required_count)
    }

    pub fn argument(&self, name: &str) -> Option<&ArgumentModel> {
        self.arguments.iter().find(|argument| argument.name == name)
    }
}
