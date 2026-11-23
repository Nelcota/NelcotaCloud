use serde::Serialize;
use utoipa::ToSchema;

/// How to reach the project's Postgres directly, without the password.
#[derive(Serialize, ToSchema)]
pub struct DirectConnectionView {
    /// `false` when this server does not offer direct connections.
    pub enabled: bool,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: String,
    pub user: String,
    /// `require`, `verify-full` or `disable` (local development).
    pub ssl_mode: String,
    /// A password was set at least once; it is never shown again.
    pub has_password: bool,
}

/// A new password for direct connections, shown only in this response.
#[derive(Serialize, ToSchema)]
pub struct NewConnectionPassword {
    pub password: String,
    /// The full `postgresql://` URL with the new password, for an ORM's `DATABASE_URL`.
    pub connection_string: String,
}
