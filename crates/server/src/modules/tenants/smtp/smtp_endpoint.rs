use oauth2::url::Url;

const SMTP_SCHEME: &str = "smtp";
const SMTPS_SCHEME: &str = "smtps";
const DEFAULT_SMTP_PORT: u16 = 25;
const DEFAULT_SMTPS_PORT: u16 = 465;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum SmtpEndpointError {
    #[error("SMTP URL is not a valid URL")]
    InvalidUrl,
    #[error("SMTP URL must start with smtp:// or smtps://")]
    UnsupportedScheme,
    #[error("SMTP URL must name a host")]
    MissingHost,
}

/// Where a tenant's SMTP URL connects to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SmtpEndpoint {
    pub host: String,
    pub port: u16,
}

impl SmtpEndpoint {
    pub fn parse(raw_url: &str) -> Result<Self, SmtpEndpointError> {
        let url = Url::parse(raw_url.trim()).map_err(|_| SmtpEndpointError::InvalidUrl)?;
        let default_port = match url.scheme() {
            SMTP_SCHEME => DEFAULT_SMTP_PORT,
            SMTPS_SCHEME => DEFAULT_SMTPS_PORT,
            _ => return Err(SmtpEndpointError::UnsupportedScheme),
        };
        let Some(host) = url.host_str() else {
            return Err(SmtpEndpointError::MissingHost);
        };

        Ok(Self {
            host: host.trim_matches(['[', ']']).to_owned(),
            port: url.port().unwrap_or(default_port),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_host_and_default_ports() -> Result<(), SmtpEndpointError> {
        let smtps = SmtpEndpoint::parse("smtps://user:pass@smtp.example.com")?;
        let smtp = SmtpEndpoint::parse("smtp://smtp.example.com:587")?;

        assert_eq!((smtps.host.as_str(), smtps.port), ("smtp.example.com", 465));
        assert_eq!((smtp.host.as_str(), smtp.port), ("smtp.example.com", 587));
        Ok(())
    }

    #[test]
    fn rejects_other_schemes() {
        assert_eq!(
            SmtpEndpoint::parse("http://smtp.example.com"),
            Err(SmtpEndpointError::UnsupportedScheme)
        );
    }
}
