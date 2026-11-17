use std::collections::HashMap;

use crate::modules::database::query::condition::Condition;
use crate::modules::database::query::order_parser::OrderTerm;
use crate::modules::database::query::select_item::SelectItem;

/// Rows one response may carry at most; also the default page size.
pub const MAX_ROWS: u32 = 1_000;

/// Path of an embed from the requested table (`["author", "teams"]`); empty for the table
/// itself.
pub type EmbedPath = Vec<String>;

/// A parsed Data API query: what to return and, for the table and each embed, which rows.
#[derive(Debug, Default)]
pub struct ReadQuery {
    /// `None` means every column (`select=*`).
    pub select: Option<Vec<SelectItem>>,
    pub nodes: HashMap<EmbedPath, QueryNode>,
    /// Upserts: the unique columns rows are matched on (the primary key when absent).
    pub on_conflict: Option<Vec<String>>,
}

/// Filters, order and page of one table of the query.
#[derive(Debug, Default)]
pub struct QueryNode {
    pub conditions: Vec<Condition>,
    pub order: Vec<OrderTerm>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

impl ReadQuery {
    pub fn node(&self, path: &[String]) -> Option<&QueryNode> {
        self.nodes.get(path)
    }

    pub fn root(&self) -> Option<&QueryNode> {
        self.nodes.get(&Vec::new())
    }

    pub fn has_root_conditions(&self) -> bool {
        self.root()
            .is_some_and(|node| node.conditions.is_empty() == false)
    }

    pub fn node_mut(&mut self, path: EmbedPath) -> &mut QueryNode {
        self.nodes.entry(path).or_default()
    }
}

impl QueryNode {
    /// At most `MAX_ROWS`, whatever the client asked.
    pub fn page_size(&self) -> u32 {
        self.limit.unwrap_or(MAX_ROWS).min(MAX_ROWS)
    }
}
