/// A change to a table, already checked against its columns.
pub enum WriteChange {
    Insert(Vec<InsertBatch>),
    Update(UpdateValues),
    Delete,
}

/// Rows that set the same columns, as a JSON array. Rows are grouped this way so a column a row
/// leaves out takes its default, never NULL.
pub struct InsertBatch {
    pub rows_json: String,
    pub columns: Vec<String>,
    /// Upsert: what to do with rows that hit a unique constraint.
    pub conflict: Option<ConflictAction>,
}

/// `ON CONFLICT (target_columns) DO UPDATE SET updated_columns` (or `DO NOTHING` when empty).
pub struct ConflictAction {
    pub target_columns: Vec<String>,
    pub updated_columns: Vec<String>,
}

/// New values as a JSON object; `columns` are its keys, all columns of the table.
pub struct UpdateValues {
    pub values_json: String,
    pub columns: Vec<String>,
}
