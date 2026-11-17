use oauth2::url::Url;

const SMTP_SCHEME: &str = "smtp";
const SMTPS_SCHEME: &str = "smtps";
const TLS_QUERY_KEY: &str = "tls";
const REQUIRED_TLS: &str = "required";
const DEFAULT_SUBMISSION_PORT: u16 = 587;
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
    #[error("SMTP requires implicit TLS (smtps://) or required STARTTLS (?tls=required)")]
    TlsRequired,
}

/// Where a tenant's SMTP URL connects to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SmtpEndpoint {
    pub host: String,
    pub port: u16,
    pub tls_mode: SmtpTlsMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SmtpTlsMode {
    Implicit,
    StartTls,
    Plain,
}

impl SmtpTlsMode {
    fn default_port(self) -> u16 {
        match self {
            Self::Implicit => DEFAULT_SMTPS_PORT,
            Self::StartTls => DEFAULT_SUBMISSION_PORT,
            Self::Plain => DEFAULT_SMTP_PORT,
        }
    }
}

impl SmtpEndpoint {
    pub fn parse(raw_url: &str) -> Result<Self, SmtpEndpointError> {
        let url = Url::parse(raw_url.trim()).map_err(|_| SmtpEndpointError::InvalidUrl)?;
        let tls_mode = match url.scheme() {
            SMTP_SCHEME => smtp_tls_mode(&url)?,
            SMTPS_SCHEME => SmtpTlsMode::Implicit,
            _ => return Err(SmtpEndpointError::UnsupportedScheme),
        };
        let Some(host) = url.host_str() else {
            return Err(SmtpEndpointError::MissingHost);
        };

        Ok(Self {
            host: host.trim_matches(['[', ']']).to_owned(),
            port: url.port().unwrap_or(tls_mode.default_port()),
            tls_mode,
        })
    }
}

/// `smtp://` is plaintext unless `?tls=required` (STARTTLS that must succeed); any other `tls`
/// value, such as opportunistic STARTTLS, could silently fall back to plaintext.
fn smtp_tls_mode(url: &Url) -> Result<SmtpTlsMode, SmtpEndpointError> {
    let mut tls_values = url
        .query_pairs()
        .filter(|(key, _)| key == TLS_QUERY_KEY)
        .map(|(_, value)| value);

    match (tls_values.next(), tls_values.next()) {
        (None, None) => Ok(SmtpTlsMode::Plain),
        (Some(value), None) if value == REQUIRED_TLS => Ok(SmtpTlsMode::StartTls),
        _ => Err(SmtpEndpointError::TlsRequired),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_host_and_default_ports() -> Result<(), SmtpEndpointError> {
        let smtps = SmtpEndpoint::parse("smtps://user:pass@smtp.example.com")?;
        let smtp = SmtpEndpoint::parse("smtp://smtp.example.com:587?tls=required")?;

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

    #[test]
    fn accepts_smtp_plaintext_only_for_development_policy() -> Result<(), SmtpEndpointError> {
        let endpoint = SmtpEndpoint::parse("smtp://user:pass@smtp.example.com:587")?;

        assert_eq!(endpoint.tls_mode, SmtpTlsMode::Plain);
        Ok(())
    }

    #[test]
    fn rejects_opportunistic_starttls() {
        assert_eq!(
            SmtpEndpoint::parse("smtp://user:pass@smtp.example.com:587?tls=opportunistic"),
            Err(SmtpEndpointError::TlsRequired)
        );
    }

    #[test]
    fn default_port_follows_the_tls_mode() -> Result<(), SmtpEndpointError> {
        let plain = SmtpEndpoint::parse("smtp://smtp.example.com")?;
        let starttls = SmtpEndpoint::parse("smtp://smtp.example.com?tls=required")?;

        assert_eq!((plain.port, plain.tls_mode), (25, SmtpTlsMode::Plain));
        assert_eq!(
            (starttls.port, starttls.tls_mode),
            (587, SmtpTlsMode::StartTls)
        );
        Ok(())
    }

    #[test]
    fn rejects_repeated_tls_parameters() {
        assert_eq!(
            SmtpEndpoint::parse("smtp://smtp.example.com?tls=required&tls=none"),
            Err(SmtpEndpointError::TlsRequired)
        );
    }
}
