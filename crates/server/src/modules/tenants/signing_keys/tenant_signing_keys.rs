use std::iter;

use axum::body::Bytes;
use jsonwebtoken::jwk::JwkSet;
use uuid::Uuid;

use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;

/// A tenant's keys, ready to use: `active` signs new tokens, every key verifies, and the public
/// JWKS document is serialized once instead of on every request.
pub struct TenantSigningKeys {
    pub active: PreparedSigningKey,
    retired: Vec<PreparedSigningKey>,
    jwks_json: Bytes,
}

impl TenantSigningKeys {
    pub fn new(
        active: PreparedSigningKey,
        retired: Vec<PreparedSigningKey>,
    ) -> Result<Self, serde_json::Error> {
        let keys = iter::once(&active)
            .chain(&retired)
            .map(|key| key.public_jwk.clone())
            .collect();
        let jwks_json = Bytes::from(serde_json::to_vec(&JwkSet { keys })?);

        Ok(Self {
            active,
            retired,
            jwks_json,
        })
    }

    /// The key that signed a token, by its `kid`.
    pub fn find(&self, key_id: Uuid) -> Option<&PreparedSigningKey> {
        iter::once(&self.active)
            .chain(&self.retired)
            .find(|key| key.key_id == key_id)
    }

    /// Cheap to clone: `Bytes` shares the serialized document.
    pub fn jwks_json(&self) -> Bytes {
        self.jwks_json.clone()
    }
}
