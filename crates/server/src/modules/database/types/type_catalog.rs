use serde::Deserialize;

/// What the type generator reads of a project's `public` schema, as the catalog query shapes it.
#[derive(Debug, Deserialize)]
pub struct TypeCatalog {
    pub relations: Vec<RelationType>,
    pub enums: Vec<EnumType>,
    pub functions: Vec<FunctionType>,
}

/// A table (`Row`, `Insert`, `Update`) or a view (`Row` only).
#[derive(Debug, Deserialize)]
pub struct RelationType {
    pub name: String,
    pub is_view: bool,
    pub columns: Vec<ColumnType>,
}

#[derive(Debug, Deserialize)]
pub struct ColumnType {
    pub name: String,
    #[serde(rename = "type")]
    pub value: ValueType,
    pub nullable: bool,
    /// A default, an identity or a serial: inserts may leave it out.
    pub has_default: bool,
    /// `GENERATED ALWAYS AS (...)`: Postgres computes it, writes may not set it.
    pub is_generated: bool,
}

/// A Postgres type as the generator needs it: the element's name, and whether it is an array.
#[derive(Debug, Deserialize)]
pub struct ValueType {
    /// `pg_type.typname` of the element (domains resolved to their base): `int4`, `text`, an enum.
    pub name: String,
    pub is_array: bool,
    /// An enum of `public`, typed as the union of its labels.
    pub is_enum: bool,
    /// The composite type of a relation of `public` (a function returning `SETOF posts`).
    pub relation: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EnumType {
    pub name: String,
    pub labels: Vec<String>,
}

/// One overload of a function callable with `rpc`.
#[derive(Debug, Deserialize)]
pub struct FunctionType {
    pub name: String,
    pub arguments: Vec<ArgumentType>,
    pub returns: ValueType,
    pub returns_set: bool,
}

#[derive(Debug, Deserialize)]
pub struct ArgumentType {
    pub name: String,
    #[serde(rename = "type")]
    pub value: ValueType,
    pub has_default: bool,
}
