use axum::http::HeaderMap;
use axum::http::header::ACCEPT;

pub const PREFER_HEADER: &str = "prefer";
/// Asks for one row as an object instead of an array (the `PostgREST` media type).
pub const SINGLE_OBJECT_MEDIA_TYPE: &str = "application/vnd.pgrst.object+json";

/// What a client asked for in `Prefer` (RFC 7240) and `Accept`; unknown preferences are
/// ignored, as the RFC requires.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Preferences {
    /// `return=representation`: answer the written rows.
    pub returns_rows: bool,
    pub count: Option<CountMode>,
    pub resolution: Option<Resolution>,
    pub is_single_object: bool,
    /// Use the table's primary key in catalog order when no root order was supplied.
    pub orders_by_primary_key: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CountMode {
    /// `count(*)` of every matching row.
    Exact,
    /// The query planner's estimate: instant, approximate.
    Planned,
}

/// Upserts: what to do with rows that hit an existing one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Resolution {
    MergeDuplicates,
    IgnoreDuplicates,
}

impl Preferences {
    pub fn from_headers(headers: &HeaderMap) -> Self {
        let mut preferences = Self {
            is_single_object: accepts_single_object(headers),
            ..Self::default()
        };
        let tokens = headers
            .get_all(PREFER_HEADER)
            .iter()
            .filter_map(|value| value.to_str().ok())
            .flat_map(|value| value.split(','))
            .map(str::trim);

        for token in tokens {
            preferences.apply(token);
        }

        preferences
    }

    fn apply(&mut self, token: &str) {
        match token {
            "return=representation" => self.returns_rows = true,
            "return=minimal" => self.returns_rows = false,
            "count=exact" => self.count = Some(CountMode::Exact),
            "count=planned" | "count=estimated" => self.count = Some(CountMode::Planned),
            "order=primary-key" => self.orders_by_primary_key = true,
            "resolution=merge-duplicates" => self.resolution = Some(Resolution::MergeDuplicates),
            "resolution=ignore-duplicates" => {
                self.resolution = Some(Resolution::IgnoreDuplicates);
            }
            _ => {}
        }
    }
}

fn accepts_single_object(headers: &HeaderMap) -> bool {
    headers
        .get_all(ACCEPT)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .any(|value| value.contains(SINGLE_OBJECT_MEDIA_TYPE))
}

#[cfg(test)]
mod tests {
    use axum::http::HeaderValue;

    use super::*;

    #[test]
    fn reads_every_preference_and_ignores_unknown_ones() {
        let mut headers = HeaderMap::new();
        headers.insert(
            PREFER_HEADER,
            HeaderValue::from_static(
                "return=representation, count=exact, order=primary-key, handling=strict",
            ),
        );
        headers.append(
            PREFER_HEADER,
            HeaderValue::from_static("resolution=merge-duplicates"),
        );
        headers.insert(ACCEPT, HeaderValue::from_static(SINGLE_OBJECT_MEDIA_TYPE));

        let preferences = Preferences::from_headers(&headers);

        assert_eq!(
            preferences,
            Preferences {
                returns_rows: true,
                count: Some(CountMode::Exact),
                resolution: Some(Resolution::MergeDuplicates),
                is_single_object: true,
                orders_by_primary_key: true,
            }
        );
    }

    #[test]
    fn defaults_to_minimal_without_count() {
        assert_eq!(
            Preferences::from_headers(&HeaderMap::new()),
            Preferences::default()
        );
    }
}
