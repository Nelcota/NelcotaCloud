use crate::modules::database::direct_connection::direct_connection_settings::DirectConnectionSettings;

/// Who connects to which database; the password is shown once, never stored by the platform.
pub struct ConnectionTarget<'a> {
    pub user: &'a str,
    pub database: &'a str,
}

/// `postgresql://user:password@host:port/database?sslmode=...`. Users, databases and the
/// generated passwords are `[a-z0-9_]`, so nothing needs percent-encoding.
pub fn connection_string(
    settings: &DirectConnectionSettings,
    target: &ConnectionTarget<'_>,
    password: &str,
) -> String {
    let DirectConnectionSettings {
        host,
        port,
        ssl_mode,
    } = settings;
    let ConnectionTarget { user, database } = target;

    format!("postgresql://{user}:{password}@{host}:{port}/{database}?sslmode={ssl_mode}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::crypto::hex_encoding::encode_hex;
    use crate::shared::crypto::random_bytes::random_bytes;

    #[test]
    fn writes_a_libpq_url_with_the_ssl_mode() {
        let settings = DirectConnectionSettings {
            host: "db.example.com".to_owned(),
            port: 6543,
            ssl_mode: "require".to_owned(),
        };
        let target = ConnectionTarget {
            user: "nelcota_c_shop",
            database: "tenant_shop",
        };

        // Generated like the real ones: no password is written in the source.
        let password = encode_hex(&random_bytes::<24>());

        assert_eq!(
            connection_string(&settings, &target, &password),
            format!(
                "postgresql://nelcota_c_shop:{password}@db.example.com:6543/tenant_shop?sslmode=require"
            )
        );
    }
}
