/// A `LIKE ... ESCAPE '\'` pattern that matches text containing `needle`. Emails and IP
/// addresses are stored lowercase; `%` and `_` typed by an admin are matched literally.
pub fn contains_pattern(needle: &str) -> String {
    let escaped = needle
        .trim()
        .to_lowercase()
        .replace('\\', r"\\")
        .replace('%', r"\%")
        .replace('_', r"\_");

    format!("%{escaped}%")
}

/// An unanchored search without three consecutive word characters can miss every GIN search key.
pub fn has_search_trigram(needle: &str) -> bool {
    needle
        .split(|character: char| character.is_alphanumeric() == false)
        .any(|word| word.chars().nth(2).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_wildcards_and_lowercases() {
        assert_eq!(contains_pattern(" Ana_100% "), r"%ana\_100\%%");
    }

    #[test]
    fn escapes_backslashes() {
        assert_eq!(contains_pattern(r"a\b"), r"%a\\b%");
    }

    #[test]
    fn detects_word_trigrams_without_counting_punctuation_or_utf8_bytes() {
        assert!(has_search_trigram("127.0"));
        assert!(has_search_trigram("Éva"));
        assert!(has_search_trigram("a-b.cd") == false);
        assert!(has_search_trigram("éé") == false);
    }
}
