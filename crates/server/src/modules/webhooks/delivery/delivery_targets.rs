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
}

/// Where a tenant's deliveries go: enabled endpoints whose secrets could be opened.
pub type DeliveryTargets = HashMap<Uuid, Arc<DeliveryTarget>>;

/// A run's targets, and every enabled endpoint: a delivery whose endpoint is not among them was
/// deleted or disabled, and is given up.
pub struct LoadedTargets {
    pub targets: DeliveryTargets,
    pub enabled_endpoint_ids: Vec<Uuid>,
}

/// An endpoint whose secret cannot be opened (a corrupt row, another master key) is logged and
/// left out, its deliveries kept pending: it must not stop the tenant's other endpoints.
pub async fn load_delivery_targets(
    control_plane_pool: &PgPool,
    secret_box: &SecretBox,
    tenant_id: Uuid,
) -> Result<LoadedTargets, DeliveryTargetsError> {
    let stored = list_endpoints(control_plane_pool, tenant_id).await?;
    let mut targets = HashMap::with_capacity(stored.len());
    let mut enabled_endpoint_ids = Vec::with_capacity(stored.len());

    for endpoint in stored.into_iter().filter(|endpoint| endpoint.is_enabled) {
        let endpoint_id = endpoint.id;
        enabled_endpoint_ids.push(endpoint_id);

        match delivery_target(secret_box, endpoint) {
            Ok(target) => {
                targets.insert(endpoint_id, Arc::new(target));
            }
            Err(error) => {
                tracing::error!(%error, %endpoint_id, "cannot open a webhook endpoint's secret");
            }
        }
    }

    Ok(LoadedTargets {
        targets,
        enabled_endpoint_ids,
    })
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
        match secret_box.open(previous_ciphertext, &context) {
            Ok(previous) => secrets.push(WebhookSecret::from_key(previous)),
            Err(error) => {
                let endpoint_id = endpoint.id;
                tracing::warn!(%error, %endpoint_id, "could not open the previous webhook secret");
            }
        }
    }

    Ok(DeliveryTarget {
        url: endpoint.url,
        secrets,
    })
}
