use serde::Serialize;
use utoipa::ToSchema;

/// Settings a tenant manages itself with its secret key.
#[derive(Debug, Clone, Serialize, sqlx::FromRow, ToSchema)]
pub struct TenantSettings {
    pub name: String,
    pub site_url: String,
    pub require_email_verification: bool,
}
