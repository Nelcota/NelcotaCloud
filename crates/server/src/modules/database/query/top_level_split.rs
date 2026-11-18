use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const SEPARATOR: char = ',';
const QUOTE: char = '"';
const ESCAPE: char = '\\';

/// Splits `a,b(c,d),"e,f"` at the commas outside parentheses and double quotes:
/// `["a", "b(c,d)", "\"e,f\""]`. Inside quotes, `\` escapes the next character. Parts are
/// trimmed; empty parts are refused.
pub fn split_top_level(text: &str) -> Result<Vec<&str>, DatabaseRejection> {
    let mut parts = Vec::new();
    let mut depth: usize = 0;
    let mut is_quoted = false;
    let mut is_escaped = false;
    let mut part_start = 0;

    for (index, character) in text.char_indices() {
        if is_escaped {
            is_escaped = false;
            continue;
        }

        match character {
            ESCAPE if is_quoted => is_escaped = true,
            QUOTE => is_quoted = is_quoted == false,
            '(' if is_quoted == false => depth = depth.saturating_add(1),
            ')' if is_quoted == false => depth = close_parenthesis(depth)?,
            SEPARATOR if is_quoted == false && depth == 0 => {
                parts.push(non_empty_part(text, part_start, index)?);
                part_start = index.saturating_add(1);
            }
            _ => {}
        }
    }

    if depth != 0 || is_quoted {
        return Err(DatabaseRejection::invalid_query(
            "unbalanced parentheses or quotes",
        ));
    }

    parts.push(non_empty_part(text, part_start, text.len())?);

    Ok(parts)
}

fn close_parenthesis(depth: usize) -> Result<usize, DatabaseRejection> {
    depth
        .checked_sub(1)
        .ok_or_else(|| DatabaseRejection::invalid_query("unbalanced parentheses"))
}

fn non_empty_part(text: &str, start: usize, end: usize) -> Result<&str, DatabaseRejection> {
    let Some(part) = text.get(start..end) else {
        return Err(DatabaseRejection::invalid_query("invalid list"));
    };
    let part = part.trim();

    if part.is_empty() {
        return Err(DatabaseRejection::invalid_query("empty item in a list"));
    }

    Ok(part)
}

/// `"a,b"` becomes `a,b` and `"say \"hi\""` becomes `say "hi"`; anything else is returned as
/// is. `"a\"` is refused: its closing quote is escaped, so the value never ends.
pub fn unquote(text: &str) -> Result<String, DatabaseRejection> {
    let Some(inner) = text
        .strip_prefix(QUOTE)
        .and_then(|rest| rest.strip_suffix(QUOTE))
    else {
        return Ok(text.to_owned());
    };
    let mut unescaped = String::with_capacity(inner.len());
    let mut is_escaped = false;

    for character in inner.chars() {
        if character == ESCAPE && is_escaped == false {
            is_escaped = true;
            continue;
        }

        is_escaped = false;
        unescaped.push(character);
    }

    if is_escaped {
        return Err(DatabaseRejection::invalid_query(
            "a quoted value ends with an escaped quote",
        ));
    }

    Ok(unescaped)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_outside_parentheses_and_quotes() -> Result<(), DatabaseRejection> {
        let parts = split_top_level("a, b(c,d) ,\"e,f\"")?;

        assert_eq!(parts, vec!["a", "b(c,d)", "\"e,f\""]);
        Ok(())
    }

    #[test]
    fn keeps_escaped_quotes_inside_one_part() -> Result<(), DatabaseRejection> {
        let parts = split_top_level(r#""a\",b",c"#)?;

        assert_eq!(parts, vec![r#""a\",b""#, "c"]);
        Ok(())
    }

    #[test]
    fn refuses_unbalanced_or_empty_lists() {
        for text in ["a,(b", "a)", "\"a", "a,,b", "", "a,"] {
            assert!(split_top_level(text).is_err(), "{text} should be refused");
        }
    }

    #[test]
    fn unquotes_only_fully_quoted_values() -> Result<(), DatabaseRejection> {
        assert_eq!(unquote("\"a,b\"")?, "a,b");
        assert_eq!(unquote("plain")?, "plain");
        assert_eq!(unquote("\"half")?, "\"half");
        assert_eq!(unquote(r#""say \"hi\" \\ ok""#)?, r#"say "hi" \ ok"#);
        assert!(unquote(r#""a\""#).is_err());
        Ok(())
    }
}
