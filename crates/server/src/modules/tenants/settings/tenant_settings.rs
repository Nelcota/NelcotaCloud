use serde::Serialize;
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
}
