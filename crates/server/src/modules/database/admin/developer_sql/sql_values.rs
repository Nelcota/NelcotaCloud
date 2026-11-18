use sqlx::postgres::PgRow;
use sqlx::{Row, ValueRef};

/// Characters of one value the console shows; longer values are cut.
const MAX_VALUE_CHARS: usize = 10_000;
const CUT_MARK: &str = "…";

/// A row's values as Postgres printed them (the simple query protocol answers text).
pub fn row_values(row: &PgRow) -> Vec<Option<String>> {
    (0..row.len())
        .map(|index| {
            let value = row.try_get_raw(index).ok()?;

            if value.is_null() {
                return None;
            }

            value.as_str().ok().map(shown_value)
        })
        .collect()
}

/// The value as shown: at most `MAX_VALUE_CHARS` characters, cut values marked.
fn shown_value(text: &str) -> String {
    let Some((cut_at, _)) = text.char_indices().nth(MAX_VALUE_CHARS) else {
        return text.to_owned();
    };
    let kept = text.get(..cut_at).unwrap_or_default();

    format!("{kept}{CUT_MARK}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cuts_long_values_on_a_character_boundary() {
        let long = "é".repeat(MAX_VALUE_CHARS + 5);
        let shown = shown_value(&long);

        assert_eq!(shown.chars().count(), MAX_VALUE_CHARS + 1);
        assert!(shown.ends_with(CUT_MARK));
        assert_eq!(shown_value("short"), "short");
    }
}
