use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;

use crate::modules::webhooks::signing::webhook_secret::WebhookSecret;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("webhook secret has an invalid length")]
pub struct InvalidSecretLength;

/// What a signature covers: the message id, the send time and the exact body bytes, so a
/// captured request cannot be replayed later or with another body.
pub struct SignedContent<'a> {
    pub message_id: &'a str,
    pub timestamp: i64,
    pub body: &'a str,
}

/// The `webhook-signature` header of Standard Webhooks: `v1,<base64 HMAC-SHA256>` per secret,
/// separated by spaces, so receivers accept either secret during a rotation.
pub fn signature_header(
    secrets: &[WebhookSecret],
    content: &SignedContent,
) -> Result<String, InvalidSecretLength> {
    let signatures: Vec<String> = secrets
        .iter()
        .map(|secret| sign(secret, content))
        .collect::<Result<_, _>>()?;

    Ok(signatures.join(" "))
}

fn sign(secret: &WebhookSecret, content: &SignedContent) -> Result<String, InvalidSecretLength> {
    let mut mac = HmacSha256::new_from_slice(secret.key()).map_err(|_| InvalidSecretLength)?;
    let timestamp = content.timestamp.to_string();
    mac.update(content.message_id.as_bytes());
    mac.update(b".");
    mac.update(timestamp.as_bytes());
    mac.update(b".");
    mac.update(content.body.as_bytes());
    let digest = mac.finalize().into_bytes();

    Ok(format!("v1,{}", STANDARD.encode(digest)))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The example from the Standard Webhooks specification, so any of its libraries accepts
    /// what we send.
    #[test]
    fn matches_the_specification_example() -> Result<(), Box<dyn std::error::Error>> {
        let key = STANDARD.decode("MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw")?;
        let content = SignedContent {
            message_id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
            timestamp: 1_614_265_330,
            body: r#"{"test": 2432232314}"#,
        };
        let header = signature_header(&[WebhookSecret::from_key(key)], &content)?;

        assert_eq!(header, "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
        Ok(())
    }

    #[test]
    fn signs_with_every_active_secret() -> Result<(), InvalidSecretLength> {
        let secrets = [WebhookSecret::generate(), WebhookSecret::generate()];
        let content = SignedContent {
            message_id: "evt",
            timestamp: 1,
            body: "{}",
        };
        let header = signature_header(&secrets, &content)?;
        let signatures: Vec<&str> = header.split(' ').collect();

        assert_eq!(signatures.len(), 2);
        assert!(
            signatures
                .iter()
                .all(|signature| signature.starts_with("v1,"))
        );
        assert_ne!(signatures.first(), signatures.last());
        Ok(())
    }

    #[test]
    fn a_different_body_changes_the_signature() -> Result<(), InvalidSecretLength> {
        let secrets = [WebhookSecret::from_key(vec![1; 24])];
        let original = SignedContent {
            message_id: "evt",
            timestamp: 1,
            body: r#"{"a":1}"#,
        };
        let tampered = SignedContent {
            body: r#"{"a":2}"#,
            ..original
        };

        assert_ne!(
            signature_header(&secrets, &original)?,
            signature_header(&secrets, &tampered)?
        );
        Ok(())
    }
}
