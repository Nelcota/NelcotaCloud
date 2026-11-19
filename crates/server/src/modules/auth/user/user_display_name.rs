use crate::modules::auth::user::user_metadata::MetadataObject;

/// The `user_metadata` keys read as the person's name, in this order: `name` is the console's
/// convention; `full_name` is what many apps (and other auth services) already write.
const NAME_KEYS: [&str; 2] = ["name", "full_name"];
/// Longer values are not names a list should show.
const MAX_NAME_CHARS: usize = 120;

/// The name the user's own metadata gives, if any: a non-blank string under a known key.
pub fn display_name(metadata: &MetadataObject) -> Option<&str> {
    NAME_KEYS
        .iter()
        .filter_map(|key| metadata.get(*key))
        .filter_map(|value| value.as_str())
        .map(str::trim)
        .find(|name| name.is_empty() == false && name.chars().count() <= MAX_NAME_CHARS)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn metadata(value: serde_json::Value) -> MetadataObject {
        match value {
            serde_json::Value::Object(map) => map,
            _ => MetadataObject::new(),
        }
    }

    #[test]
    fn prefers_name_then_full_name() {
        let both = metadata(json!({"name": "Bia", "full_name": "Beatriz Souza"}));
        let full = metadata(json!({"full_name": " Beatriz Souza "}));

        assert_eq!(display_name(&both), Some("Bia"));
        assert_eq!(display_name(&full), Some("Beatriz Souza"));
    }

    #[test]
    fn ignores_blank_long_and_non_text_values() {
        let long = "a".repeat(121);
        for value in [
            json!({"name": "   "}),
            json!({"name": 42}),
            json!({"name": long}),
            json!({}),
        ] {
            assert_eq!(display_name(&metadata(value)), None);
        }

        let fallback = metadata(json!({"name": "  ", "full_name": "Ana"}));
        assert_eq!(display_name(&fallback), Some("Ana"));
    }
}
