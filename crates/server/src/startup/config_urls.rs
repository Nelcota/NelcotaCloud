use url::Url;

use crate::startup::config_error::ConfigError;

const PUBLIC_URL_SCHEMES: [&str; 2] = ["http", "https"];
const POSTGRES_URL_SCHEMES: [&str; 2] = ["postgres", "postgresql"];

/// Becomes the JWT issuer and the OAuth callback, so it must be a plain http(s) origin or path.
pub fn validate_public_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl("PUBLIC_BASE_URL", "an http(s) URL without query");
    let url = match Url::parse(raw_url.trim()) {
        Ok(url) => url,
        Err(_) => return Err(invalid),
    };

    if PUBLIC_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    if url.query().is_some() || url.fragment().is_some() {
        return Err(invalid);
    }

    // It is the issuer of every token and the OAuth callback: credentials in it would leak.
    if url.username().is_empty() == false || url.password().is_some() {
        return Err(invalid);
    }

    Ok(())
}

/// Each tenant database name is appended to it, so it must not carry a database path or query.
/// Its password is required: the Data API role's password is derived from it.
pub fn validate_tenant_database_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl(
        "TENANT_DATABASE_BASE_URL",
        "a postgres:// server URL with a password, without database name, query or fragment",
    );
    let url = match Url::parse(raw_url.trim()) {
        Ok(url) => url,
        Err(_) => return Err(invalid),
    };

    if POSTGRES_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    if has_more_than_server(&url) || url.password().unwrap_or_default().is_empty() {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn public_base_url_is_a_plain_origin_or_path() {
        assert!(validate_public_base_url("https://auth.example.com").is_ok());
        assert!(validate_public_base_url("https://auth.example.com/api").is_ok());

        for raw in [
            "",
            "auth.example.com",
            "ftp://auth.example.com",
            "https://auth.example.com/?a=1",
            "https://auth.example.com/#x",
            "https://user:secret@auth.example.com",
            "https://user@auth.example.com",
        ] {
            assert!(validate_public_base_url(raw).is_err(), "{raw}");
        }
    }
}
