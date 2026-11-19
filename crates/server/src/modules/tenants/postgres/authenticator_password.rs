use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;
use url::Url;

use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::shared::crypto::hex_encoding::encode_hex;

type HmacSha256 = Hmac<Sha256>;

const PASSWORD_LABEL: &str = "nelcota tenant authenticator";

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("TENANT_DATABASE_BASE_URL has no password to derive the Data API passwords from")]
pub struct MissingServerPassword;

/// A project's authenticator password, derived from `TENANT_DATABASE_BASE_URL`'s credentials.
///
/// Every instance and test server computes the same value without one more secret to
/// configure; changing the server password changes it too. Only lowercase hex, so it can be
/// written into `ALTER ROLE ... PASSWORD` safely.
pub fn authenticator_password(
    tenant_database_base_url: &str,
    slug: &TenantSlug,
) -> Result<String, MissingServerPassword> {
    let base_password = server_password(tenant_database_base_url)?;
    let mut mac =
        HmacSha256::new_from_slice(base_password.as_bytes()).map_err(|_| MissingServerPassword)?;
    mac.update(PASSWORD_LABEL.as_bytes());
    mac.update(b":");
    mac.update(slug.as_str().as_bytes());

    Ok(encode_hex(&mac.finalize().into_bytes()))
}

fn server_password(tenant_database_base_url: &str) -> Result<String, MissingServerPassword> {
    let url = Url::parse(tenant_database_base_url.trim()).map_err(|_| MissingServerPassword)?;
    let password = url
        .password()
        .filter(|password| password.is_empty() == false)
        .ok_or(MissingServerPassword)?;

    Ok(password.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn slug(text: &str) -> Result<TenantSlug, Box<dyn std::error::Error>> {
        Ok(TenantSlug::parse(text)?)
    }

    #[test]
    fn is_stable_per_server_password_and_project() -> Result<(), Box<dyn std::error::Error>> {
        let shop = slug("shop")?;
        let first = authenticator_password("postgres://nelcota:secret@db:5432", &shop)?;
        let second = authenticator_password("postgres://nelcota:secret@other:5432", &shop)?;
        let other_project =
            authenticator_password("postgres://nelcota:secret@db:5432", &slug("blog")?)?;
        let other_server = authenticator_password("postgres://nelcota:another@db:5432", &shop)?;

        assert_eq!(first, second);
        assert_eq!(first.len(), 64);
        assert!(first.chars().all(|character| character.is_ascii_hexdigit()));
        assert_ne!(first, other_project);
        assert_ne!(first, other_server);
        Ok(())
    }

    #[test]
    fn refuses_servers_without_a_password() -> Result<(), Box<dyn std::error::Error>> {
        let shop = slug("shop")?;

        assert_eq!(
            authenticator_password("postgres://nelcota@db:5432", &shop),
            Err(MissingServerPassword)
        );
        Ok(())
    }
}
