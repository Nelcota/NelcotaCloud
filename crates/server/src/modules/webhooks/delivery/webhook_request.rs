use crate::modules::webhooks::signing::webhook_secret::WebhookSecret;

/// Error text kept for the delivery log, never the receiver's response body.
const MAX_ERROR_LENGTH: usize = 300;

/// Where and how to sign: the endpoint's URL and every secret currently signing for it.
pub struct DeliveryTarget {
    pub url: String,
    pub secrets: Vec<WebhookSecret>,
}

/// One message: the event id (stable across retries, so receivers can drop duplicates) and
/// the exact body that is signed and sent.
pub struct WebhookMessage {
    pub id: String,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeliveryOutcome {
    Delivered { status: u16 },
    Failed { status: Option<u16>, error: String },
}

pub fn outcome_of(status: reqwest::StatusCode) -> DeliveryOutcome {
    let code = status.as_u16();

    if status.is_success() {
        return DeliveryOutcome::Delivered { status: code };
    }

    DeliveryOutcome::Failed {
        status: Some(code),
        error: format!("the endpoint answered {code}"),
    }
}

pub fn failed(status: Option<u16>, error: &impl std::fmt::Display) -> DeliveryOutcome {
    let error: String = error.to_string().chars().take(MAX_ERROR_LENGTH).collect();

    DeliveryOutcome::Failed { status, error }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_2xx_answers_are_delivered() {
        assert_eq!(
            outcome_of(reqwest::StatusCode::NO_CONTENT),
            DeliveryOutcome::Delivered { status: 204 }
        );

        for status in [
            reqwest::StatusCode::MOVED_PERMANENTLY,
            reqwest::StatusCode::BAD_REQUEST,
            reqwest::StatusCode::SERVICE_UNAVAILABLE,
        ] {
            let outcome = outcome_of(status);

            assert!(
                matches!(
                    outcome,
                    DeliveryOutcome::Failed {
                        status: Some(_),
                        ..
                    }
                ),
                "{status}"
            );
        }
    }
}
