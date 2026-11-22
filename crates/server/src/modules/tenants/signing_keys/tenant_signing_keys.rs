use std::iter;

use axum::body::Bytes;
use jsonwebtoken::jwk::JwkSet;
use time::OffsetDateTime;
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
        let now = OffsetDateTime::now_utc();

        self.verifying_keys(now).find(|key| key.key_id == key_id)
    }

    fn verifying_keys(&self, now: OffsetDateTime) -> impl Iterator<Item = &PreparedSigningKey> {
        iter::once(&self.active).chain(
            self.retired
                .iter()
                .filter(move |key| key.verify_until.is_some_and(|until| until > now)),
        )
    }

    /// Cheap to clone: `Bytes` shares the serialized document.
    pub fn jwks_json(&self) -> Result<Bytes, serde_json::Error> {
        let now = OffsetDateTime::now_utc();

        if self
            .retired
            .iter()
            .all(|key| key.verify_until.is_some_and(|until| until > now))
        {
            return Ok(self.jwks_json.clone());
        }

        let keys = self
            .verifying_keys(now)
            .map(|key| key.public_jwk.clone())
            .collect();

        serde_json::to_vec(&JwkSet { keys }).map(Bytes::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::tenants::signing_keys::signing_key::SigningKey;

    #[test]
    fn omits_expired_keys_from_verification_and_cached_jwks()
    -> Result<(), Box<dyn std::error::Error>> {
        let active = PreparedSigningKey::prepare(&SigningKey::generate()?)?;
        let mut retired = PreparedSigningKey::prepare(&SigningKey::generate()?)?;
        retired.verify_until = Some(OffsetDateTime::UNIX_EPOCH);
        let retired_id = retired.key_id;
        let keys = TenantSigningKeys::new(active, vec![retired])?;

        assert!(keys.find(retired_id).is_none());
        let jwks: JwkSet = serde_json::from_slice(&keys.jwks_json()?)?;
        assert_eq!(jwks.keys.len(), 1);

        Ok(())
    }
}
