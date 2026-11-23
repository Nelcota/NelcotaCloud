use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// The project's `public` schema as the console shows it: tables with their columns, keys,
/// row level security and policies, plus callable functions.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SchemaOverview {
    pub tables: Vec<TableOverview>,
    pub functions: Vec<FunctionOverview>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TableOverview {
    pub name: String,
    /// `table`, `view`, `materialized_view` or `foreign_table`.
    pub kind: String,
    pub rls_enabled: bool,
    /// The planner's estimate; `null` before the table was ever analyzed.
    pub estimated_rows: Option<i64>,
    /// Disk taken by the table with its indexes and TOAST data; `0` for views.
    pub size_bytes: i64,
    pub columns: Vec<ColumnOverview>,
    pub foreign_keys: Vec<ForeignKeyOverview>,
    pub indexes: Vec<IndexOverview>,
    pub policies: Vec<PolicyOverview>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ColumnOverview {
    pub name: String,
    /// As Postgres writes it, with modifiers (`character varying(20)`, `integer[]`).
    #[serde(rename = "type")]
    pub type_name: String,
    pub nullable: bool,
    /// The default expression (`now()`), or `null`.
    pub default: Option<String>,
    pub is_identity: bool,
    pub is_primary_key: bool,
    pub is_unique: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ForeignKeyOverview {
    pub name: String,
    pub columns: Vec<String>,
    pub foreign_table: String,
    pub foreign_columns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct IndexOverview {
    pub name: String,
    /// Key columns, or expressions (`lower(email)`), in order.
    pub columns: Vec<String>,
    /// `btree`, `gin`, `gist`, `hash`, `brin`...
    pub method: String,
    pub is_primary: bool,
    pub is_unique: bool,
    pub size_bytes: i64,
    /// Times the planner used it since the statistics were last reset.
    pub scans: i64,
    /// The `CREATE INDEX` statement that rebuilds it.
    pub definition: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PolicyOverview {
    pub name: String,
    /// `all`, `select`, `insert`, `update` or `delete`.
    pub command: String,
    /// `anon`, `authenticated`, or other role names; `public` is every role.
    pub roles: Vec<String>,
    /// Rows the policy lets through (`USING`).
    pub using: Option<String>,
    /// Rows the policy lets be written (`WITH CHECK`).
    pub with_check: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FunctionOverview {
    pub name: String,
    /// `a integer, b integer DEFAULT 10`.
    pub arguments: String,
    /// `integer`, `SETOF posts`, `TABLE(n integer)`.
    pub returns: String,
}
