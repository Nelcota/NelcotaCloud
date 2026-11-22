use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;

/// Settings a tenant manages itself with its secret key.
#[derive(Debug, Clone, Serialize, sqlx::FromRow, ToSchema)]
pub struct TenantSettings {
    pub name: String,
    pub site_url: String,
    pub require_email_verification: bool,
    /// Zero selects the automatic mascot. Values 1 through 32 select a catalog entry.
    #[schema(minimum = 0, maximum = 32)]
    pub mascot_id: i16,
    /// When the logo last changed; `null` while the project has none. Also the logo's version.
    #[serde(with = "time::serde::rfc3339::option")]
    pub logo_updated_at: Option<OffsetDateTime>,
}
