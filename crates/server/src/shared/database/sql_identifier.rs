/// A name written into SQL as a quoted identifier (`"my ""table"""`).
///
/// Names cannot be bound as
/// parameters, so every table, column or alias goes through here; doubling the quotes keeps
/// any character inside the identifier.
pub fn quote_identifier(name: &str) -> String {
    let escaped = name.replace('"', "\"\"");

    format!("\"{escaped}\"")
}

/// A string written into SQL as a literal (`'it''s'`), for statements that take no parameters
/// (DDL). Doubling the quotes keeps any character inside the literal.
pub fn quote_literal(text: &str) -> String {
    let escaped = text.replace('\'', "''");

    format!("'{escaped}'")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_plain_names() {
        assert_eq!(quote_identifier("posts"), "\"posts\"");
    }

    #[test]
    fn doubles_quotes_so_names_cannot_end_the_identifier() {
        assert_eq!(
            quote_identifier("a\"; DROP TABLE x; --"),
            "\"a\"\"; DROP TABLE x; --\""
        );
    }

    #[test]
    fn doubles_single_quotes_in_literals() {
        assert_eq!(quote_literal("it's"), "'it''s'");
    }
}
