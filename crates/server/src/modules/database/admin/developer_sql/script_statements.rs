use std::ops::Range;

use pg_query::{
    NodeEnum,
    protobuf::{RawStmt, TransactionStmtKind},
};

use crate::modules::database::rejection::database_rejection::DatabaseRejection;

pub struct ScriptStatement {
    range: Range<usize>,
    pub returns_rows: bool,
    pub changes_rows: bool,
}

impl ScriptStatement {
    pub fn source<'a>(&self, script: &'a str) -> Option<&'a str> {
        script.get(self.range.clone()).map(str::trim)
    }
}

/// Validate transaction boundaries before sending the script and capture result metadata.
pub fn describe_script(script: &str) -> Result<Vec<ScriptStatement>, DatabaseRejection> {
    let parsed = pg_query::parse(script, 0)
        .map_err(|error| DatabaseRejection::SqlError(error.to_string()))?;

    parsed
        .protobuf
        .stmts
        .iter()
        .map(|statement| describe_statement(script, statement))
        .collect()
}

fn describe_statement(
    script: &str,
    statement: &RawStmt,
) -> Result<ScriptStatement, DatabaseRejection> {
    let node = statement
        .stmt
        .as_ref()
        .and_then(|statement| statement.node.as_ref())
        .ok_or_else(invalid_statement)?;
    let range = statement_range(script, statement).ok_or_else(invalid_statement)?;

    if changes_transaction_boundary(node) {
        return Err(DatabaseRejection::SqlError(
            "the SQL editor manages the transaction; use savepoints for partial rollbacks"
                .to_owned(),
        ));
    }

    Ok(ScriptStatement {
        range,
        returns_rows: returns_rows(node),
        changes_rows: matches!(
            node,
            NodeEnum::InsertStmt(_)
                | NodeEnum::UpdateStmt(_)
                | NodeEnum::DeleteStmt(_)
                | NodeEnum::MergeStmt(_)
        ),
    })
}

fn invalid_statement() -> DatabaseRejection {
    DatabaseRejection::SqlError("could not determine the SQL statement boundaries".to_owned())
}

fn statement_range(script: &str, statement: &RawStmt) -> Option<Range<usize>> {
    let start = usize::try_from(statement.stmt_location).ok()?;
    let length = usize::try_from(statement.stmt_len).ok()?;
    let end = match length {
        0 => script.len(),
        _ => start.checked_add(length)?,
    };
    let range = start..end;
    script.get(range.clone())?;

    Some(range)
}

fn changes_transaction_boundary(node: &NodeEnum) -> bool {
    let NodeEnum::TransactionStmt(statement) = node else {
        return false;
    };

    matches!(
        statement.kind(),
        TransactionStmtKind::TransStmtSavepoint
            | TransactionStmtKind::TransStmtRelease
            | TransactionStmtKind::TransStmtRollbackTo
    ) == false
}

fn returns_rows(node: &NodeEnum) -> bool {
    match node {
        NodeEnum::SelectStmt(statement) => statement.into_clause.is_none(),
        NodeEnum::InsertStmt(statement) => statement.returning_clause.is_some(),
        NodeEnum::UpdateStmt(statement) => statement.returning_clause.is_some(),
        NodeEnum::DeleteStmt(statement) => statement.returning_clause.is_some(),
        NodeEnum::MergeStmt(statement) => statement.returning_clause.is_some(),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_postgres_scripts_using_byte_offsets() -> Result<(), DatabaseRejection> {
        let script = "select ';' as aé; -- one; two\n\
                      select \"x;y\" from t; /* a; /* nested; */ b; */ select 1;;\n\
                      create function f() returns int as $body$ select 1; $body$ language sql;\n\
                      select E'it\\'s; fine', $1";
        let statements = describe_script(script)?;
        let sources: Vec<_> = statements
            .iter()
            .filter_map(|statement| statement.source(script))
            .collect();

        assert_eq!(sources.len(), 5);
        assert_eq!(sources.first().copied(), Some("select ';' as aé"));
        assert_eq!(sources.last().copied(), Some("select E'it\\'s; fine', $1"));

        Ok(())
    }

    #[test]
    fn skips_empty_and_comment_only_statements() -> Result<(), DatabaseRejection> {
        assert!(describe_script(" ; -- nothing\n ; /* none */")?.is_empty());

        Ok(())
    }

    #[test]
    fn identifies_empty_result_sets_from_the_statement_type() -> Result<(), DatabaseRejection> {
        let script = "select 1; values (1); table t; delete from t returning id;
                      with x as (select 1) update t set a = 1; update t set a = 'returning';
                      create table returning_log (id int)";
        let described = describe_script(script)?;
        let kinds: Vec<_> = described
            .iter()
            .map(|statement| statement.returns_rows)
            .collect();

        assert_eq!(kinds, [true, true, true, true, false, false, false]);
        assert!(
            described
                .get(3)
                .is_some_and(|statement| statement.changes_rows)
        );

        Ok(())
    }

    #[test]
    fn rejects_malformed_scripts_before_execution() {
        assert!(describe_script("select 1; selec from ;").is_err());
    }

    #[test]
    fn refuses_transaction_boundaries_but_allows_savepoints() {
        for script in [
            "BEGIN",
            "START TRANSACTION",
            "END",
            "ROLLBACK AND CHAIN",
            "PREPARE TRANSACTION 'draft'",
        ] {
            assert!(describe_script(script).is_err(), "{script}");
        }

        assert!(describe_script("SAVEPOINT draft; ROLLBACK TO draft; RELEASE draft").is_ok());
    }
}
