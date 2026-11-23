use std::time::{Duration, Instant};

use reqwest::header::CONTENT_TYPE;
use time::OffsetDateTime;

use crate::modules::webhooks::delivery::public_resolver::PublicResolver;
use crate::modules::webhooks::delivery::response_excerpt::read_excerpt;
use crate::modules::webhooks::delivery::webhook_request::{
    AttemptReport, DeliveryOutcome, DeliveryTarget, WebhookMessage, failed, outcome_of,
};
use crate::modules::webhooks::endpoint::webhook_url::{WebhookHostPolicy, WebhookUrl};
use crate::modules::webhooks::signing::webhook_signature::{SignedContent, signature_header};

/// A slow receiver holds one delivery slot at most this long; it should answer quickly and do
/// its work afterwards.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const USER_AGENT: &str = "NelcotaCloud-Webhooks/1.0";
const ID_HEADER: &str = "webhook-id";
const TIMESTAMP_HEADER: &str = "webhook-timestamp";
const SIGNATURE_HEADER: &str = "webhook-signature";

/// Sends signed webhook requests. One client for every delivery, so connections to the same
/// receiver are reused. It never follows redirects: a 3xx could point at a private address.
#[derive(Clone)]
pub struct WebhookTransport {
    client: reqwest::Client,
    policy: WebhookHostPolicy,
}

impl WebhookTransport {
    pub fn new(policy: WebhookHostPolicy) -> Result<Self, reqwest::Error> {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(REQUEST_TIMEOUT)
            .connect_timeout(CONNECT_TIMEOUT)
            .user_agent(USER_AGENT)
            // A proxy would resolve the target itself, out of reach of `PublicResolver`.
            .no_proxy()
            .dns_resolver(PublicResolver { policy })
            .build()?;

        Ok(Self { client, policy })
    }

    pub fn policy(&self) -> WebhookHostPolicy {
        self.policy
    }

    /// Sends one signed request. Any 2xx answer counts as delivered.
    pub async fn send(&self, target: &DeliveryTarget, message: &WebhookMessage) -> AttemptReport {
        // Checked again on every attempt: the policy may be stricter than when it was saved.
        if let Err(error) = WebhookUrl::parse(&target.url, self.policy) {
            return AttemptReport::unanswered(failed(None, &error));
        }

        let timestamp = OffsetDateTime::now_utc().unix_timestamp();
        let content = SignedContent {
            message_id: &message.id,
            timestamp,
            body: &message.body,
        };
        let signature = match signature_header(&target.secrets, &content) {
            Ok(signature) => signature,
            Err(error) => return AttemptReport::unanswered(failed(None, &error)),
        };
        let request = self
            .client
            .post(&target.url)
            .header(CONTENT_TYPE, "application/json")
            .header(ID_HEADER, &message.id)
            .header(TIMESTAMP_HEADER, timestamp.to_string())
            .header(SIGNATURE_HEADER, signature)
            .body(message.body.clone());

        let started = Instant::now();
        let response = match request.send().await {
            Ok(response) => response,
            Err(error) => return AttemptReport::unanswered(failed(None, &error.without_url())),
        };
        let duration_ms = i32::try_from(started.elapsed().as_millis()).ok();
        let outcome = outcome_of(response.status());

        AttemptReport {
            response_excerpt: refusal_excerpt(&outcome, response).await,
            outcome,
            duration_ms,
        }
    }
}

/// Only a refusal's answer is kept: an accepted delivery needs no debugging.
async fn refusal_excerpt(outcome: &DeliveryOutcome, response: reqwest::Response) -> Option<String> {
    if matches!(outcome, DeliveryOutcome::Delivered { .. }) {
        return None;
    }

    read_excerpt(response).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::webhooks::signing::webhook_secret::WebhookSecret;

    #[tokio::test]
    async fn refuses_private_targets_without_sending() -> Result<(), reqwest::Error> {
        let transport = WebhookTransport::new(WebhookHostPolicy::PublicHttpsOnly)?;
        let target = DeliveryTarget {
            url: "https://10.0.0.1/hook".to_owned(),
            secrets: vec![WebhookSecret::generate()],
        };
        let message = WebhookMessage {
            id: "evt".to_owned(),
            body: "{}".to_owned(),
        };
        let report = transport.send(&target, &message).await;

        assert!(matches!(
            report.outcome,
            DeliveryOutcome::Failed { status: None, .. }
        ));
        Ok(())
    }
}
