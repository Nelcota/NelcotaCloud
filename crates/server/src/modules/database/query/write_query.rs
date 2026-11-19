use crate::modules::database::query::read_query::ReadQuery;

/// Selection and filters for a mutation, plus the conflict target used by upserts.
#[derive(Debug, Default)]
pub struct WriteQuery {
    pub selection: ReadQuery,
    pub on_conflict: Option<Vec<String>>,
}
