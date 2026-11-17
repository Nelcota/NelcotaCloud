use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::read_query::{EmbedPath, QueryNode, ReadQuery};
use crate::modules::database::query::select_item::SelectItem;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{SchemaModel, TableModel};
use crate::modules::database::sql::condition_writer::{AliasedTable, push_conditions, push_order};
use crate::modules::database::sql::projection_writer::push_projection;

/// One table of a query: the requested one, or an embed under it.
pub struct Level<'a> {
    pub table: &'a TableModel,
    /// What to return; `None` is every column.
    pub items: Option<&'a [SelectItem]>,
    pub path: EmbedPath,
    /// `FROM` target: `public."posts"`, or the name of a CTE holding written rows.
    pub source: String,
    /// Alias of `source` in the statement (`t0` for the requested table).
    pub alias: String,
    /// Equalities with the parent row, for embeds.
    pub link: Vec<String>,
    /// Off for rows a write already selected with its own filters.
    pub applies_filters: bool,
}

/// What a level is written for: its rows as JSON, or only counting them.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LevelMode {
    Rows,
    Count,
}

/// Writes nested `SELECT`s for a query, numbering table aliases so embeds never collide.
pub struct SelectWriter<'a> {
    pub schema: &'a SchemaModel,
    pub query: &'a ReadQuery,
    next_alias: usize,
}

impl<'a> SelectWriter<'a> {
    pub fn new(schema: &'a SchemaModel, query: &'a ReadQuery) -> Self {
        Self {
            schema,
            query,
            next_alias: 0,
        }
    }

    pub fn push_level(
        &mut self,
        sql: &mut QueryBuilder<Postgres>,
        level: &Level<'a>,
        mode: LevelMode,
    ) -> Result<(), DatabaseRejection> {
        let alias = &level.alias;
        let target = AliasedTable {
            table: level.table,
            alias,
        };
        let embeds = self.plan_embeds(level)?;

        sql.push("SELECT ");
        match mode {
            LevelMode::Rows => push_projection(sql, target, level.items, &embeds)?,
            LevelMode::Count => {
                sql.push("1");
            }
        }
        sql.push(format!(" FROM {} {alias}", level.source));

        for embed in embeds
            .iter()
            .filter(|embed| mode == LevelMode::Rows || embed.selection.is_inner)
        {
            self.push_embed_join(sql, level, embed)?;
        }

        self.push_where(sql, level, target)?;

        if mode == LevelMode::Rows {
            self.push_page(sql, level, target)?;
        }

        Ok(())
    }

    fn push_where(
        &self,
        sql: &mut QueryBuilder<Postgres>,
        level: &Level<'a>,
        target: AliasedTable,
    ) -> Result<(), DatabaseRejection> {
        let node = self
            .query
            .node(&level.path)
            .filter(|_| level.applies_filters);
        let conditions = node
            .map(|node| node.conditions.as_slice())
            .unwrap_or_default();

        if level.link.is_empty() && conditions.is_empty() {
            return Ok(());
        }

        sql.push(" WHERE true");
        for equality in &level.link {
            sql.push(format!(" AND {equality}"));
        }

        if conditions.is_empty() == false {
            sql.push(" AND ");
            push_conditions(sql, target, conditions)?;
        }

        Ok(())
    }

    /// Order and page of the requested table and of to-many embeds (a to-one embed has a
    /// single row).
    fn push_page(
        &self,
        sql: &mut QueryBuilder<Postgres>,
        level: &Level<'a>,
        target: AliasedTable,
    ) -> Result<(), DatabaseRejection> {
        let default_node = QueryNode::default();
        let node = self.query.node(&level.path).unwrap_or(&default_node);
        push_order(sql, target, &node.order)?;

        // Written rows are all answered; the requested table is always paged; embeds only when
        // asked.
        if level.applies_filters == false {
            return Ok(());
        }

        if level.link.is_empty() == false && node.limit.is_none() && node.offset.is_none() {
            return Ok(());
        }

        sql.push(" LIMIT ").push_bind(i64::from(node.page_size()));
        sql.push(" OFFSET ")
            .push_bind(i64::from(node.offset.unwrap_or(0)));

        Ok(())
    }

    pub(super) fn take_alias(&mut self, prefix: &str) -> String {
        self.next_alias = self.next_alias.saturating_add(1);

        format!("{prefix}{}", self.next_alias)
    }
}
