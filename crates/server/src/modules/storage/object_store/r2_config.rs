use url::{Host, Url};

use crate::startup::config_error::ConfigError;

#[derive(Clone)]
pub struct R2Config<'a> {
    pub endpoint: &'a str,
    pub bucket: &'a str,
    pub access_key_id: &'a str,
    pub secret_access_key: &'a str,
}

impl<'a> R2Config<'a> {
    pub fn parse(values: [Option<&'a str>; 4]) -> Result<Option<Self>, ConfigError> {
        let [endpoint, bucket, access_key_id, secret_access_key] = values.map(|value| {
            value
                .map(str::trim)
                .filter(|value| value.is_empty() == false)
        });

        match (endpoint, bucket, access_key_id, secret_access_key) {
            (None, None, None, None) => Ok(None),
            (Some(endpoint), Some(bucket), Some(access_key_id), Some(secret_access_key)) => {
                validate_endpoint(endpoint)?;
                validate_bucket(bucket)?;

                Ok(Some(Self {
                    endpoint,
                    bucket,
                    access_key_id,
                    secret_access_key,
                }))
            }
            _ => Err(ConfigError::IncompleteStorageConfig),
        }
    }
}

fn validate_endpoint(endpoint: &str) -> Result<(), ConfigError> {
    let invalid = || {
        ConfigError::InvalidUrl(
            "STORAGE_R2_ENDPOINT",
            "an HTTPS origin or a loopback development origin",
        )
    };
    let url = Url::parse(endpoint).map_err(|_| invalid())?;
    let host = url.host().ok_or_else(invalid)?;
    let is_loopback = match host {
        Host::Domain(domain) => domain == "localhost",
        Host::Ipv4(address) => address.is_loopback(),
        Host::Ipv6(address) => address.is_loopback(),
    };

    if (url.scheme() == "https" || (url.scheme() == "http" && is_loopback)) == false
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
        || url.username().is_empty() == false
        || url.password().is_some()
    {
        return Err(invalid());
    }

    Ok(())
}

fn validate_bucket(bucket: &str) -> Result<(), ConfigError> {
    if (3..=63).contains(&bucket.len()) == false
        || bucket.starts_with('-')
        || bucket.ends_with('-')
        || bucket
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
            == false
    {
        return Err(ConfigError::InvalidStorageBucket);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configuration_is_optional_and_requires_every_setting_when_enabled() {
        assert!(matches!(R2Config::parse([None; 4]), Ok(None)));
        assert!(matches!(
            R2Config::parse([Some("https://storage.example"), None, None, None]),
            Err(ConfigError::IncompleteStorageConfig)
        ));
    }

    #[test]
    fn only_loopback_endpoints_can_use_http() {
        assert!(validate_endpoint("http://127.0.0.1:9000").is_ok());
        assert!(validate_endpoint("http://storage.example").is_err());
        assert!(validate_endpoint("https://storage.example/prefix").is_err());
        assert!(validate_endpoint("https://user:pass@storage.example").is_err());
    }

    #[test]
    fn physical_bucket_names_use_lowercase_letters_digits_and_hyphens() {
        assert!(validate_bucket("project-files-01").is_ok());
        assert!(validate_bucket("Project_files").is_err());
        assert!(validate_bucket("-files").is_err());
    }
}
