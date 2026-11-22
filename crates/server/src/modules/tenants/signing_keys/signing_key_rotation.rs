use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key::SigningKey;
use crate::modules::tenants::signing_keys::signing_key_repository::{
    SealedSigningKey, SigningKeyStoreError, insert_active_signing_key,
};
use crate::shared::crypto::secret_box::SecretBox;

/// Retired keys keep verifying this long, far beyond the lifetime of any access token they
/// signed, then they are deleted.
pub const RETIRED_KEY_RETENTION_SECONDS: i64 = 24 * 60 * 60;
/// Retired keys kept at once: each one is decrypted on every cache load and listed in the JWKS.
const MAX_RETIRED_KEYS: i64 = 5;

/// Makes a new key sign the tenant's tokens. The previous key stays in the JWKS, so tokens it
/// signed keep verifying until they expire.
///
/// The caller locks the tenant row first: concurrent rotations run one after the other instead of
/// both trying to insert an active key.
pub async fn rotate_signing_key(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    secret_box: &SecretBox,
) -> Result<Uuid, SigningKeyStoreError> {
    let signing_key = SigningKey::generate()?;
    let sealed_key = SealedSigningKey::seal(&signing_key, tenant_id, secret_box)?;
    delete_expired_retired_keys(connection, tenant_id).await?;
    ensure_room_for_retired_key(connection, tenant_id).await?;
    retire_active_key(connection, tenant_id).await?;
    insert_active_signing_key(connection, tenant_id, &sealed_key).await?;

    Ok(sealed_key.key_id)
}

async fn ensure_room_for_retired_key(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), SigningKeyStoreError> {
    let retired: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM tenant_signing_keys WHERE tenant_id = $1 AND is_active = FALSE",
    )
    .bind(tenant_id)
    .fetch_one(connection)
    .await?;

    if retired >= MAX_RETIRED_KEYS {
        return Err(SigningKeyStoreError::TooManyRotations(MAX_RETIRED_KEYS));
    }

    Ok(())
}

async fn retire_active_key(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE tenant_signing_keys SET is_active = FALSE, deactivated_at = now() WHERE tenant_id = $1 AND is_active",
    )
    .bind(tenant_id)
    .execute(connection)
    .await?;

    Ok(())
}

/// Retired keys stay in the JWKS only while tokens they signed can still be valid.
async fn delete_expired_retired_keys(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM tenant_signing_keys WHERE tenant_id = $1 AND is_active = FALSE \
         AND (deactivated_at IS NULL OR deactivated_at < now() - $2::bigint * interval '1 second')",
    )
    .bind(tenant_id)
    .bind(RETIRED_KEY_RETENTION_SECONDS)
    .execute(connection)
    .await?;

    Ok(())
}
