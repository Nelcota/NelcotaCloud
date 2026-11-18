use crate::modules::database::admin::developer_sql::sql_token_scanner::{
    is_identifier_byte, skip_token,
};

/// Statements whose first word means they answer rows (even none).
const QUERY_WORDS: [&str; 4] = ["select", "with", "values", "table"];
const RETURNING_WORD: &str = "returning";

/// The statements of a script as Postgres runs them: split on `;` outside quotes, quoted
/// identifiers, dollar quotes and comments, without the empty ones (Postgres skips those too).
pub fn split_statements(script: &str) -> Vec<&str> {
    let bytes = script.as_bytes();
    let mut statements = Vec::new();
    let mut start = 0;
    let mut has_content = false;
    let mut index = 0;

    while let Some(&byte) = bytes.get(index) {
        if byte == b';' {
            push_statement(&mut statements, script.get(start..index), has_content);
            start = index.saturating_add(1);
            has_content = false;
            index = start;
            continue;
        }

        let (next, is_content) = skip_token(script, index);
        has_content = has_content || is_content;
        index = next;
    }

    push_statement(&mut statements, script.get(start..), has_content);
    statements
}

/// Whether the statement answers rows: a query, or a write with `RETURNING`.
pub fn answers_rows(statement: &str) -> bool {
    let lowercase = statement.to_ascii_lowercase();
    let first_word = leading_word(&lowercase);

    QUERY_WORDS.contains(&first_word)
        || lowercase
            .split(|character: char| character.is_ascii_alphanumeric() == false && character != '_')
            .any(|word| word == RETURNING_WORD)
}

fn push_statement<'a>(statements: &mut Vec<&'a str>, text: Option<&'a str>, has_content: bool) {
    if let Some(text) = text.filter(|_| has_content) {
        statements.push(text.trim());
    }
}

/// The first word after leading spaces and comments.
fn leading_word(lowercase: &str) -> &str {
    let mut index = 0;
    let bytes = lowercase.as_bytes();

    while let (next, false) = skip_token(lowercase, index) {
        if next > bytes.len() {
            return "";
        }

        index = next;
    }

    let rest = lowercase.get(index..).unwrap_or_default();
    let length = rest
        .bytes()
        .take_while(|&byte| is_identifier_byte(byte))
        .count();

    rest.get(..length).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_outside_quotes_comments_and_dollar_quotes() {
        let script = "select ';' as a; -- one; two\n\
                      select \"x;y\" from t; /* a; /* nested; */ b; */ select 1;;\n\
                      create function f() returns int as $body$ select 1; $body$ language sql;\n\
                      select E'it\\'s; fine', $1";

        assert_eq!(
            split_statements(script),
            vec![
                "select ';' as a",
                "-- one; two\nselect \"x;y\" from t",
                "/* a; /* nested; */ b; */ select 1",
                "create function f() returns int as $body$ select 1; $body$ language sql",
                "select E'it\\'s; fine', $1",
            ]
        );
    }

    #[test]
    fn skips_empty_and_comment_only_statements() {
        assert!(split_statements(" ; -- nothing\n ; /* none */").is_empty());
    }

    #[test]
    fn tells_statements_that_answer_rows() {
        for statement in [
            "SELECT 1",
            "-- note\n  with x as (select 1) select * from x",
            "/* c */ values (1)",
            "delete from t returning id",
        ] {
            assert!(answers_rows(statement), "{statement}");
        }

        for statement in ["update t set a = 1", "create table returning_log (id int)"] {
            assert!(answers_rows(statement) == false, "{statement}");
        }
    }
}
