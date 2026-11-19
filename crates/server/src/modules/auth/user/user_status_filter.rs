use serde::Deserialize;
use utoipa::ToSchema;

/// Narrows the user list to the accounts that need an admin's attention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum UserStatusFilter {
    /// The email was never confirmed.
    Unverified,
    Banned,
}
