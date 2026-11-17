use oauth2::url::Url;

use crate::startup::config_error::ConfigError;

const PUBLIC_URL_SCHEMES: [&str; 2] = ["http", "https"];
const POSTGRES_URL_SCHEMES: [&str; 2] = ["postgres", "postgresql"];

/// Becomes the JWT issuer and the OAuth callback, so it must be a plain http(s) origin or path.
pub fn validate_public_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl("PUBLIC_BASE_URL", "an http(s) URL without query");
    let Ok(url) = Url::parse(raw_url.trim()) else {
        return Err(invalid);
    };

    if PUBLIC_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    if url.query().is_some() || url.fragment().is_some() {
        return Err(invalid);
    }

    Ok(())
}

/// Each tenant database name is appended to it, so it must not carry a database path or query.
pub fn validate_tenant_database_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl(
        "TENANT_DATABASE_BASE_URL",
        "a postgres:// server URL without database name, query or fragment",
    );
    let Ok(url) = Url::parse(raw_url.trim()) else {
        return Err(invalid);
    };

    if POSTGRES_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    if has_more_than_server(&url) {
        return Err(invalid);
    }

    Ok(())
}

/// A database path, query or fragment; a fragment would swallow the appended database name and
/// every tenant would share one database.
fn has_more_than_server(url: &Url) -> bool {
    let has_path = url.path().trim_matches('/').is_empty() == false;

    has_path || url.query().is_some() || url.fragment().is_some()
}
