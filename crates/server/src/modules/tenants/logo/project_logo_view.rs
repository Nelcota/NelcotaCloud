use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;

/// The logo just stored; `updated_at` is its version, the same as `logo_updated_at` elsewhere.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectLogoView {
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}
