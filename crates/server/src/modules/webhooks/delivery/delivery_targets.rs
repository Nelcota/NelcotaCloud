use std::collections::HashMap;
use std::sync::Arc;

use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::delivery::webhook_request::DeliveryTarget;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::{
    StoredWebhookEndpoint, list_endpoints, webhook_secret_context,
};
use crate::modules::webhooks::signing::webhook_secret::WebhookSecret;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum DeliveryTargetsError {
    #[error("database error while loading webhook endpoints: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Decryption(#[from] SecretBoxError),
}

/// Where a tenant's deliveries go: only enabled endpoints. A delivery whose endpoint is not
/// here was deleted or disabled, and is given up.
pub type DeliveryTargets = HashMap<Uuid, Arc<DeliveryTarget>>;

pub async fn load_delivery_targets(
    control_plane_pool: &PgPool,
    secret_box: &SecretBox,
    tenant_id: Uuid,
) -> Result<DeliveryTargets, DeliveryTargetsError> {
    let stored = list_endpoints(control_plane_pool, tenant_id).await?;
    let mut targets = HashMap::with_capacity(stored.len());

    for endpoint in stored.into_iter().filter(|endpoint| endpoint.is_enabled) {
        let endpoint_id = endpoint.id;
        let target = delivery_target(secret_box, endpoint)?;
        targets.insert(endpoint_id, Arc::new(target));
    }

    Ok(targets)
}

/// The URL and the secrets signing for it: the current one, plus the previous one for a day
/// after a rotation.
pub fn delivery_target(
    secret_box: &SecretBox,
    endpoint: StoredWebhookEndpoint,
) -> Result<DeliveryTarget, SecretBoxError> {
    let context = webhook_secret_context(endpoint.tenant_id, endpoint.id);
    let current = secret_box.open(&endpoint.secret_ciphertext, &context)?;
    let mut secrets = vec![WebhookSecret::from_key(current)];

    if let Some(previous_ciphertext) = &endpoint.active_previous_secret_ciphertext {
        let previous = secret_box.open(previous_ciphertext, &context)?;
        secrets.push(WebhookSecret::from_key(previous));
    }

    Ok(DeliveryTarget {
        url: endpoint.url,
        secrets,
    })
}
