use std::ops::Range;

use pg_query::{NodeEnum, protobuf::RawStmt};

pub struct ScriptStatement {
    range: Range<usize>,
    pub returns_rows: bool,
}

impl ScriptStatement {
    pub fn source<'a>(&self, script: &'a str) -> Option<&'a str> {
        script.get(self.range.clone()).map(str::trim)
    }
}

/// Local parsing is only for result metadata. If it fails, the server still executes the
/// script and supplies the authoritative syntax error or result.
pub fn describe_script(script: &str) -> Vec<ScriptStatement> {
    let parsed = match pg_query::parse(script, 0) {
        Ok(parsed) => parsed,
        Err(_) => return Vec::new(),
    };

    parsed
        .protobuf
        .stmts
        .iter()
        .filter_map(|statement| describe_statement(script, statement))
        .collect()
}

fn describe_statement(script: &str, statement: &RawStmt) -> Option<ScriptStatement> {
    let start = usize::try_from(statement.stmt_location).ok()?;
    let length = usize::try_from(statement.stmt_len).ok()?;
    let end = match length {
        0 => script.len(),
        _ => start.checked_add(length)?,
    };
    let range = start..end;
    let node = statement.stmt.as_ref()?.node.as_ref()?;

    script.get(range.clone())?;

    Some(ScriptStatement {
        range,
        returns_rows: returns_rows(node),
    })
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
    fn splits_postgres_scripts_using_byte_offsets() {
        let script = "select ';' as aé; -- one; two\n\
                      select \"x;y\" from t; /* a; /* nested; */ b; */ select 1;;\n\
                      create function f() returns int as $body$ select 1; $body$ language sql;\n\
                      select E'it\\'s; fine', $1";
        let statements = describe_script(script);
        let sources: Vec<_> = statements
            .iter()
            .filter_map(|statement| statement.source(script))
            .collect();

        assert_eq!(sources.len(), 5);
        assert_eq!(sources.first().copied(), Some("select ';' as aé"));
        assert_eq!(sources.last().copied(), Some("select E'it\\'s; fine', $1"));
    }

    #[test]
    fn skips_empty_and_comment_only_statements() {
        assert!(describe_script(" ; -- nothing\n ; /* none */").is_empty());
    }

    #[test]
    fn identifies_empty_result_sets_from_the_statement_type() {
        let script = "select 1; values (1); table t; delete from t returning id;
                      with x as (select 1) update t set a = 1; update t set a = 'returning';
                      create table returning_log (id int)";
        let described = describe_script(script);
        let kinds: Vec<_> = described
            .iter()
            .map(|statement| statement.returns_rows)
            .collect();

        assert_eq!(kinds, [true, true, true, true, false, false, false]);
    }

    #[test]
    fn leaves_malformed_scripts_for_postgres_to_reject() {
        assert!(describe_script("select 1; selec from ;").is_empty());
    }
}
