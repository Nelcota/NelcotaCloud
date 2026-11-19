use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;
use crate::modules::tenants::signing_keys::signing_key::{SigningKey, SigningKeyError};
use crate::modules::tenants::signing_keys::signing_key_rotation::RETIRED_KEY_RETENTION_SECONDS;
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
    #[error("too many recent rotations: at most {0} retired keys are kept at once")]
    TooManyRotations(i64),
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
    // Retired keys verify only within their retention: one rotated out because it leaked must
    // stop verifying even if nobody rotates again (rotation is what deletes it).
    let rows: Vec<StoredSigningKey> = sqlx::query_as(
        "SELECT id, private_key_ciphertext, is_active FROM tenant_signing_keys WHERE tenant_id = $1 \
         AND (is_active OR deactivated_at > now() - $2::bigint * interval '1 second') \
         ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .bind(RETIRED_KEY_RETENTION_SECONDS)
    .fetch_all(pool)
    .await?;
    let (active, retired) = prepare_keys(secret_box, tenant_id, rows)?;
    let active = active.ok_or(SigningKeyStoreError::NoActiveKey(tenant_id))?;

    Ok(TenantSigningKeys::new(active, retired)?)
}

/// The active key, if any, and the retired ones that could be opened.
fn prepare_keys(
    secret_box: &SecretBox,
    tenant_id: Uuid,
    rows: Vec<StoredSigningKey>,
) -> Result<(Option<PreparedSigningKey>, Vec<PreparedSigningKey>), SigningKeyStoreError> {
    let mut active = None;
    let mut retired = Vec::with_capacity(rows.len());

    for stored in rows {
        let key_id = stored.id;

        match (
            open_and_prepare(secret_box, tenant_id, &stored),
            stored.is_active,
        ) {
            (Ok(prepared), true) => active = Some(prepared),
            (Ok(prepared), false) => retired.push(prepared),
            (Err(error), true) => return Err(error),
            (Err(error), false) => {
                tracing::error!(%error, %key_id, "skipping unusable inactive signing key");
            }
        }
    }

    Ok((active, retired))
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
    stored: &StoredSigningKey,
) -> Result<PreparedSigningKey, SigningKeyStoreError> {
    let context = signing_key_context(tenant_id, stored.id);
    let private_key_der = secret_box.open(&stored.private_key_ciphertext, &context)?;
    let signing_key = SigningKey {
        key_id: stored.id,
        private_key_der,
    };

    Ok(PreparedSigningKey::prepare(&signing_key)?)
}

/// Binds each ciphertext to its tenant and key, so it cannot be replayed in another row.
fn signing_key_context(tenant_id: Uuid, key_id: Uuid) -> String {
    format!("signing_key:{tenant_id}:{key_id}")
}
