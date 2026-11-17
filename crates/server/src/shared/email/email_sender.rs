use lettre::message::Mailbox;
use lettre::message::MultiPart;
use lettre::{Address, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::shared::email::outgoing_email::OutgoingEmail;

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("invalid SMTP_URL: {0}")]
    InvalidSmtpUrl(lettre::transport::smtp::Error),
    #[error("invalid email address: {0}")]
    InvalidAddress(#[from] lettre::address::AddressError),
    #[error("failed to build email: {0}")]
    Build(#[from] lettre::error::Error),
    #[error("failed to deliver email")]
    Delivery(#[from] lettre::transport::smtp::Error),
}

/// Delivers emails through the SMTP server in `SMTP_URL`.
pub struct EmailSender {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

impl EmailSender {
    pub fn new(smtp_url: &str, from: &str) -> Result<Self, EmailError> {
        let builder = AsyncSmtpTransport::<Tokio1Executor>::from_url(smtp_url.trim())
            .map_err(EmailError::InvalidSmtpUrl)?;
        let from = from.trim().parse::<Mailbox>()?;

        Ok(Self {
            transport: builder.build(),
            from,
        })
    }

    /// For transports configured by the caller (e.g. pinned to an already checked address).
    pub fn with_transport(
        transport: AsyncSmtpTransport<Tokio1Executor>,
        from: &str,
    ) -> Result<Self, EmailError> {
        let from = from.trim().parse::<Mailbox>()?;

        Ok(Self { transport, from })
    }

    pub async fn send(&self, email: OutgoingEmail) -> Result<(), EmailError> {
        let message = Message::builder()
            .from(self.from.clone())
            // A bare address, so a "Name <address>" string can never redirect the email.
            .to(Mailbox::new(None, email.to.parse::<Address>()?))
            .subject(email.subject)
            .multipart(MultiPart::alternative_plain_html(
                email.text_body,
                email.html_body,
            ))?;
        self.transport.send(message).await?;

        Ok(())
    }
}

/// For background deliveries, where nobody waits for the result: failures are only logged.
pub async fn deliver_and_log(sender: &EmailSender, email: OutgoingEmail) {
    if let Err(error) = sender.send(email).await {
        log_failed_delivery(&error);
    }
}

/// The SMTP server's reply text can quote the recipient, so a rejection is logged by its
/// status code only; connection, TLS and timeout errors carry no address and are logged whole.
fn log_failed_delivery(error: &EmailError) {
    let EmailError::Delivery(smtp_error) = error else {
        tracing::error!(%error, "failed to send email");
        return;
    };

    if let Some(status) = smtp_error.status() {
        tracing::error!(
            smtp_status = %status,
            is_permanent = smtp_error.is_permanent(),
            "SMTP server rejected the email"
        );
        return;
    }

    if smtp_error.is_response() {
        tracing::error!("SMTP server sent a response that could not be parsed");
        return;
    }

    tracing::error!(error = %smtp_error, "failed to deliver email");
}
