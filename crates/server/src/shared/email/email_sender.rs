use std::sync::Arc;

use lettre::message::Mailbox;
use lettre::message::header::ContentType;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

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

    pub async fn send(&self, email: OutgoingEmail) -> Result<(), EmailError> {
        let message = Message::builder()
            .from(self.from.clone())
            .to(email.to.parse::<Mailbox>()?)
            .subject(email.subject)
            .header(ContentType::TEXT_PLAIN)
            .body(email.body)?;
        self.transport.send(message).await?;

        Ok(())
    }
}

/// Sends without making the request wait for SMTP, and so without the response time
/// revealing whether an email was sent. Failures are logged without the address.
pub fn send_in_background(sender: Arc<EmailSender>, email: OutgoingEmail) {
    tokio::spawn(async move {
        if let Err(error) = sender.send(email).await {
            tracing::error!(%error, "failed to send email");
        }
    });
}
