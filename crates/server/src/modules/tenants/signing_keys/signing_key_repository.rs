use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key::SigningKey;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum SigningKeyStoreError {
    #[error("database error while accessing signing keys: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("tenant {0} has no active signing key")]
    NoActiveKey(Uuid),
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

/// The tenant's keys: `active` signs new tokens, every key in `verifying` is accepted.
pub struct TenantSigningKeys {
    pub active: SigningKey,
    pub verifying: Vec<SigningKey>,
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

/// An inactive key that cannot be decrypted is skipped (only old tokens fail to verify);
/// the active one must open, or the tenant could neither sign nor verify.
pub async fn load_signing_keys(
    pool: &PgPool,
    tenant_id: Uuid,
    secret_box: &SecretBox,
) -> Result<TenantSigningKeys, SigningKeyStoreError> {
    let rows: Vec<(Uuid, Vec<u8>, bool)> = sqlx::query_as(
        "SELECT id, private_key_ciphertext, is_active FROM tenant_signing_keys WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;
    let mut active = None;
    let mut verifying = Vec::new();

    for (key_id, ciphertext, is_active) in rows {
        let opened = secret_box.open(&ciphertext, &signing_key_context(tenant_id, key_id));
        let Some(signing_key) = keep_usable_key(key_id, opened, is_active)? else {
            continue;
        };

        if is_active {
            active = Some(signing_key.clone());
        }

        verifying.push(signing_key);
    }

    let Some(active) = active else {
        return Err(SigningKeyStoreError::NoActiveKey(tenant_id));
    };

    Ok(TenantSigningKeys { active, verifying })
}

fn keep_usable_key(
    key_id: Uuid,
    opened: Result<Vec<u8>, SecretBoxError>,
    is_active: bool,
) -> Result<Option<SigningKey>, SecretBoxError> {
    match opened {
        Ok(private_key_der) => Ok(Some(SigningKey {
            key_id,
            private_key_der,
        })),
        Err(error) if is_active => Err(error),
        Err(error) => {
            tracing::error!(%error, %key_id, "skipping undecryptable inactive signing key");
            Ok(None)
        }
    }
}

/// Binds each ciphertext to its tenant and key, so it cannot be replayed in another row.
fn signing_key_context(tenant_id: Uuid, key_id: Uuid) -> String {
    format!("signing_key:{tenant_id}:{key_id}")
}
