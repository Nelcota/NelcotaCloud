use crate::startup::config_error::ConfigError;

const DEFAULT_PORT: u16 = 6543;
const SSL_MODES: &[&str] = &["require", "verify-full", "disable"];
const DEFAULT_SSL_MODE: &str = "require";

/// Where apps reach a project's Postgres directly: the connection pooler in front of the
/// server. Absent, direct connections are off and only the Data API reaches the databases.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DirectConnectionSettings {
    pub host: String,
    pub port: u16,
    /// `sslmode` of the connection string: `require` in production, `disable` only locally.
    pub ssl_mode: String,
}

/// The raw `DATABASE_PUBLIC_*` values.
pub struct DirectConnectionValues<'a> {
    pub host: Option<&'a str>,
    pub port: Option<u16>,
    pub ssl_mode: Option<&'a str>,
}

impl DirectConnectionSettings {
    /// `None` without `DATABASE_PUBLIC_HOST`; a host must be a bare name or address.
    pub fn parse(values: &DirectConnectionValues<'_>) -> Result<Option<Self>, ConfigError> {
        let Some(host) = values
            .host
            .map(str::trim)
            .filter(|host| host.is_empty() == false)
        else {
            return Ok(None);
        };

        if host.chars().any(|character| "/:@?# ".contains(character)) {
            return Err(ConfigError::InvalidUrl(
                "DATABASE_PUBLIC_HOST",
                "a host name or address",
            ));
        }

        let port = values.port.unwrap_or(DEFAULT_PORT);

        if port == 0 {
            return Err(ConfigError::InvalidUrl(
                "DATABASE_PUBLIC_PORT",
                "a port from 1 to 65535",
            ));
        }

        let ssl_mode = values.ssl_mode.map(str::trim).unwrap_or(DEFAULT_SSL_MODE);

        if SSL_MODES.contains(&ssl_mode) == false {
            return Err(ConfigError::InvalidUrl(
                "DATABASE_PUBLIC_SSL_MODE",
                "require, verify-full or disable",
            ));
        }

        Ok(Some(Self {
            host: host.to_owned(),
            port,
            ssl_mode: ssl_mode.to_owned(),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn values<'a>(host: Option<&'a str>, ssl_mode: Option<&'a str>) -> DirectConnectionValues<'a> {
        DirectConnectionValues {
            host,
            port: None,
            ssl_mode,
        }
    }

    #[test]
    fn no_host_turns_direct_connections_off() {
        assert_eq!(
            DirectConnectionSettings::parse(&values(None, None)),
            Ok(None)
        );
        assert_eq!(
            DirectConnectionSettings::parse(&values(Some("  "), None)),
            Ok(None)
        );
    }

    #[test]
    fn a_host_gets_the_pooler_port_and_required_tls_by_default() {
        let settings = DirectConnectionSettings::parse(&values(Some("db.example.com"), None));

        assert_eq!(
            settings,
            Ok(Some(DirectConnectionSettings {
                host: "db.example.com".to_owned(),
                port: 6543,
                ssl_mode: "require".to_owned(),
            }))
        );
    }

    #[test]
    fn refuses_urls_and_unknown_ssl_modes() {
        let url = DirectConnectionSettings::parse(&values(Some("postgres://db"), None));
        let mode = DirectConnectionSettings::parse(&values(Some("db"), Some("prefer")));

        assert!(url.is_err());
        assert!(mode.is_err());
    }
}
