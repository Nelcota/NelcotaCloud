const EMPTY_SECTION: &str = "{ [_ in never]: never }";

/// `{ ... }` with one entry per line, or an empty record when there is nothing to list.
pub fn block(entries: &[String], closing_indent: &str) -> String {
    if entries.is_empty() {
        return EMPTY_SECTION.to_owned();
    }

    format!("{{\n{}\n{closing_indent}}}", entries.join("\n"))
}
