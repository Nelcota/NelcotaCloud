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
}

/// A signing key whose private part is already encrypted with the master key.
pub struct SealedSigningKey {
    pub key_id: Uuid,
    pub private_key_ciphertext: Vec<u8>,
}

impl SealedSigningKey {
    pub fn seal(signing_key: &SigningKey, secret_box: &SecretBox) -> Result<Self, SecretBoxError> {
        let private_key_ciphertext = secret_box.seal(&signing_key.private_key_der)?;

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

/// Every key of the tenant, active first: the first one signs, all of them verify.
pub async fn load_signing_keys(
    pool: &PgPool,
    tenant_id: Uuid,
    secret_box: &SecretBox,
) -> Result<Vec<SigningKey>, SigningKeyStoreError> {
    let rows: Vec<(Uuid, Vec<u8>)> = sqlx::query_as(
        "SELECT id, private_key_ciphertext FROM tenant_signing_keys WHERE tenant_id = $1 ORDER BY is_active DESC, created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|(key_id, ciphertext)| {
            let private_key_der = secret_box.open(&ciphertext)?;

            Ok(SigningKey {
                key_id,
                private_key_der,
            })
        })
        .collect()
}
