use std::net::IpAddr;

use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::transport::smtp::extension::ClientId;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use oauth2::url::Url;
use percent_encoding::percent_decode_str;

use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpTlsMode};
use crate::shared::email::email_sender::{EmailError, EmailSender};

#[derive(Debug, thiserror::Error)]
pub enum PinnedSenderError {
    #[error("SMTP URL is not valid")]
    InvalidUrl,
    #[error("SMTP TLS settings are not valid: {0}")]
    InvalidTls(lettre::transport::smtp::Error),
    #[error(transparent)]
    Email(#[from] EmailError),
}

/// Where and how a pinned sender connects.
pub struct PinnedConnection<'a> {
    pub smtp_url: &'a str,
    pub endpoint: &'a SmtpEndpoint,
    /// One of the addresses the host policy checked, so DNS cannot change it afterwards.
    pub address: IpAddr,
}

/// Connects to the checked IP while validating TLS against the configured host name.
pub fn pinned_email_sender(
    connection: &PinnedConnection<'_>,
    from: &str,
) -> Result<EmailSender, PinnedSenderError> {
    let url = Url::parse(connection.smtp_url.trim()).map_err(|_| PinnedSenderError::InvalidUrl)?;
    let endpoint = connection.endpoint;
    let mut builder =
        AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(connection.address.to_string())
            .port(endpoint.port)
            .tls(tls_for(endpoint)?);

    if let Some(credentials) = credentials_in(&url)? {
        builder = builder.credentials(credentials);
    }

    // Like lettre's `from_url`: a path names the domain sent in EHLO.
    let hello_domain = url.path().trim_matches('/');

    if hello_domain.is_empty() == false {
        builder = builder.hello_name(ClientId::Domain(hello_domain.to_owned()));
    }

    Ok(EmailSender::with_transport(builder.build(), from)?)
}

fn tls_for(endpoint: &SmtpEndpoint) -> Result<Tls, PinnedSenderError> {
    let parameters =
        TlsParameters::new(endpoint.host.clone()).map_err(PinnedSenderError::InvalidTls)?;

    Ok(match endpoint.tls_mode {
        SmtpTlsMode::Implicit => Tls::Wrapper(parameters),
        SmtpTlsMode::StartTls => Tls::Required(parameters),
        SmtpTlsMode::Plain => Tls::None,
    })
}

/// `user:password@` in the URL, percent-decoded; none without a password.
fn credentials_in(url: &Url) -> Result<Option<Credentials>, PinnedSenderError> {
    let Some(password) = url.password() else {
        return Ok(None);
    };
    let username = percent_decoded(url.username())?;
    let password = percent_decoded(password)?;

    Ok(Some(Credentials::new(username, password)))
}

fn percent_decoded(text: &str) -> Result<String, PinnedSenderError> {
    let decoded = percent_decode_str(text)
        .decode_utf8()
        .map_err(|_| PinnedSenderError::InvalidUrl)?;

    Ok(decoded.into_owned())
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;

    fn connection_for<'a>(smtp_url: &'a str, endpoint: &'a SmtpEndpoint) -> PinnedConnection<'a> {
        PinnedConnection {
            smtp_url,
            endpoint,
            address: IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10)),
        }
    }

    #[test]
    fn builds_senders_for_every_tls_mode() -> Result<(), Box<dyn std::error::Error>> {
        for smtp_url in [
            "smtps://user:p%40ss@smtp.example.com",
            "smtp://user:pass@smtp.example.com?tls=required",
            "smtp://smtp.example.com/mail.acme.com",
        ] {
            let endpoint = SmtpEndpoint::parse(smtp_url)?;
            pinned_email_sender(&connection_for(smtp_url, &endpoint), "Acme <a@acme.com>")?;
        }

        Ok(())
    }

    #[test]
    fn decodes_credentials() -> Result<(), Box<dyn std::error::Error>> {
        let url = Url::parse("smtps://us%3Aer:p%40ss@smtp.example.com")?;

        assert!(credentials_in(&url)?.is_some());
        assert!(credentials_in(&Url::parse("smtps://smtp.example.com")?)?.is_none());
        Ok(())
    }

    #[test]
    fn rejects_credentials_that_are_not_utf8() -> Result<(), Box<dyn std::error::Error>> {
        let url = Url::parse("smtps://user:%FF@smtp.example.com")?;

        assert!(matches!(
            credentials_in(&url),
            Err(PinnedSenderError::InvalidUrl)
        ));
        Ok(())
    }
}
