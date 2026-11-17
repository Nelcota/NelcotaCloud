/// One entry of `select=`: every column, one column, or a related table embedded as JSON.
#[derive(Debug, PartialEq, Eq)]
pub enum SelectItem {
    AllColumns,
    Column(ColumnSelection),
    Embed(EmbedSelection),
}

#[derive(Debug, PartialEq, Eq)]
pub struct ColumnSelection {
    pub name: String,
    pub alias: Option<String>,
    pub cast: Option<CastType>,
}

/// `alias:relation!hint!inner(items)`.
#[derive(Debug, PartialEq, Eq)]
pub struct EmbedSelection {
    pub relation: String,
    pub alias: Option<String>,
    /// A foreign key constraint or column name, when two tables are related more than once.
    pub hint: Option<String>,
    /// Keeps only rows that have a related row (an inner join).
    pub is_inner: bool,
    pub items: Vec<SelectItem>,
}

/// Types a column may be cast to in the response (`price::text`); a closed list, so a cast
/// never writes arbitrary text into SQL.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CastType {
    Text,
    Integer,
    BigInt,
    Numeric,
    DoublePrecision,
    Boolean,
    Json,
    Jsonb,
    Date,
    Timestamptz,
    Uuid,
}

impl CastType {
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "text" => Some(Self::Text),
            "int" | "integer" | "int4" => Some(Self::Integer),
            "bigint" | "int8" => Some(Self::BigInt),
            "numeric" => Some(Self::Numeric),
            "float8" | "double precision" => Some(Self::DoublePrecision),
            "bool" | "boolean" => Some(Self::Boolean),
            "json" => Some(Self::Json),
            "jsonb" => Some(Self::Jsonb),
            "date" => Some(Self::Date),
            "timestamptz" => Some(Self::Timestamptz),
            "uuid" => Some(Self::Uuid),
            _ => None,
        }
    }

    pub fn sql_name(self) -> &'static str {
        match self {
            Self::Text => "text",
            Self::Integer => "integer",
            Self::BigInt => "bigint",
            Self::Numeric => "numeric",
            Self::DoublePrecision => "double precision",
            Self::Boolean => "boolean",
            Self::Json => "json",
            Self::Jsonb => "jsonb",
            Self::Date => "date",
            Self::Timestamptz => "timestamptz",
            Self::Uuid => "uuid",
        }
    }
}

impl EmbedSelection {
    /// The key of the embedded value in each row, also the path its filters are named by.
    pub fn key(&self) -> &str {
        self.alias.as_deref().unwrap_or(&self.relation)
    }
}

impl ColumnSelection {
    pub fn key(&self) -> &str {
        self.alias.as_deref().unwrap_or(&self.name)
    }
}
