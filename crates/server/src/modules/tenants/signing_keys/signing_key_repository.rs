use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;
use crate::modules::tenants::signing_keys::signing_key::{SigningKey, SigningKeyError};
use crate::modules::tenants::signing_keys::tenant_signing_keys::TenantSigningKeys;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum SigningKeyStoreError {
    #[error("database error while accessing signing keys: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("tenant {0} has no active signing key")]
    NoActiveKey(Uuid),
    #[error(transparent)]
    InvalidKey(#[from] SigningKeyError),
    #[error("failed to serialize the tenant JWKS: {0}")]
    Jwks(#[from] serde_json::Error),
}

/// A signing key whose private part is already encrypted with the master key.
pub struct SealedSigningKey {
    pub key_id: Uuid,
    pub private_key_ciphertext: Vec<u8>,
}

impl SealedSigningKey {
    pub fn seal(
        signing_key: &SigningKey,
        tenant_id: Uuid,
        secret_box: &SecretBox,
    ) -> Result<Self, SecretBoxError> {
        let context = signing_key_context(tenant_id, signing_key.key_id);
        let private_key_ciphertext = secret_box.seal(&signing_key.private_key_der, &context)?;

        Ok(Self {
            key_id: signing_key.key_id,
            private_key_ciphertext,
        })
    }
}

pub async fn insert_active_signing_key(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    sealed_key: &SealedSigningKey,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_signing_keys (id, tenant_id, private_key_ciphertext, is_active) VALUES ($1, $2, $3, TRUE)",
    )
    .bind(sealed_key.key_id)
    .bind(tenant_id)
    .bind(&sealed_key.private_key_ciphertext)
    .execute(connection)
    .await?;

    Ok(())
}

/// An inactive key that cannot be opened is skipped (only old tokens fail to verify); the
/// active one must open, or the tenant could neither sign nor verify.
pub async fn load_signing_keys(
    pool: &PgPool,
    tenant_id: Uuid,
    secret_box: &SecretBox,
) -> Result<TenantSigningKeys, SigningKeyStoreError> {
    let rows: Vec<StoredSigningKey> = sqlx::query_as(
        "SELECT id, private_key_ciphertext, is_active FROM tenant_signing_keys WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;
    let mut active = None;
    let mut retired = Vec::with_capacity(rows.len());

    for stored in rows {
        let key_id = stored.id;
        let is_active = stored.is_active;

        match (open_and_prepare(secret_box, tenant_id, stored), is_active) {
            (Ok(prepared), true) => active = Some(prepared),
            (Ok(prepared), false) => retired.push(prepared),
            (Err(error), true) => return Err(error),
            (Err(error), false) => {
                tracing::error!(%error, %key_id, "skipping unusable inactive signing key");
            }
        }
    }

    let Some(active) = active else {
        return Err(SigningKeyStoreError::NoActiveKey(tenant_id));
    };

    Ok(TenantSigningKeys::new(active, retired)?)
}

#[derive(sqlx::FromRow)]
struct StoredSigningKey {
    id: Uuid,
    private_key_ciphertext: Vec<u8>,
    is_active: bool,
}

fn open_and_prepare(
    secret_box: &SecretBox,
    tenant_id: Uuid,
    stored: StoredSigningKey,
) -> Result<PreparedSigningKey, SigningKeyStoreError> {
    let context = signing_key_context(tenant_id, stored.id);
    let private_key_der = secret_box.open(&stored.private_key_ciphertext, &context)?;
    let signing_key = SigningKey {
        key_id: stored.id,
        private_key_der,
    };

    Ok(PreparedSigningKey::prepare(signing_key)?)
}

/// Binds each ciphertext to its tenant and key, so it cannot be replayed in another row.
fn signing_key_context(tenant_id: Uuid, key_id: Uuid) -> String {
    format!("signing_key:{tenant_id}:{key_id}")
}
