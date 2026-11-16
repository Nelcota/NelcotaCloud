use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_repository::{ApiKeyOwner, insert_api_key};
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_provisioner::{
    NewTenantRequest, ProvisionedTenant,
};
use crate::modules::tenants::provisioning::tenant_repository::{NewTenant, insert_tenant};
use crate::modules::tenants::signing_keys::signing_key::SigningKey;
use crate::modules::tenants::signing_keys::signing_key_repository::{
    SealedSigningKey, insert_active_signing_key,
};
use crate::shared::crypto::opaque_token::OpaqueToken;
use crate::shared::crypto::secret_box::SecretBox;

/// Secrets generated for a new tenant, already encrypted or hashed for storage.
struct TenantCredentials {
    sealed_signing_key: SealedSigningKey,
    publishable_key: OpaqueToken,
    secret_key: OpaqueToken,
}

impl TenantCredentials {
    fn generate(tenant_id: Uuid, secret_box: &SecretBox) -> Result<Self, ProvisioningError> {
        let signing_key = SigningKey::generate()?;

        Ok(Self {
            sealed_signing_key: SealedSigningKey::seal(&signing_key, tenant_id, secret_box)?,
            publishable_key: OpaqueToken::generate(ApiKeyKind::Publishable.token_prefix()),
            secret_key: OpaqueToken::generate(ApiKeyKind::Secret.token_prefix()),
        })
    }
}

/// Writes the tenant row, its signing key and both API keys inside the caller's transaction,
/// so they become visible together, or not at all.
pub async fn register_tenant(
    transaction: &mut PgConnection,
    secret_box: &SecretBox,
    request: NewTenantRequest,
) -> Result<ProvisionedTenant, ProvisioningError> {
    let tenant_id = Uuid::new_v4();
    let credentials = TenantCredentials::generate(tenant_id, secret_box)?;
    let new_tenant = NewTenant {
        tenant_id,
        slug: &request.slug,
        name: &request.name,
        site_url: &request.site_url,
        require_email_verification: request.require_email_verification,
    };
    insert_tenant(transaction, new_tenant).await?;
    insert_active_signing_key(transaction, tenant_id, &credentials.sealed_signing_key).await?;
    store_api_keys(transaction, tenant_id, &credentials).await?;

    Ok(ProvisionedTenant {
        tenant_id,
        slug: request.slug,
        publishable_key: credentials.publishable_key.plaintext,
        secret_key: credentials.secret_key.plaintext,
    })
}

async fn store_api_keys(
    transaction: &mut PgConnection,
    tenant_id: Uuid,
    credentials: &TenantCredentials,
) -> Result<(), sqlx::Error> {
    let publishable_owner = ApiKeyOwner {
        tenant_id,
        kind: ApiKeyKind::Publishable,
    };
    let secret_owner = ApiKeyOwner {
        tenant_id,
        kind: ApiKeyKind::Secret,
    };
    insert_api_key(
        transaction,
        publishable_owner,
        &credentials.publishable_key.hash,
    )
    .await?;

    insert_api_key(transaction, secret_owner, &credentials.secret_key.hash).await
}
