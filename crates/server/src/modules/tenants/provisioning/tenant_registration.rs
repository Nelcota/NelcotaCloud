use sqlx::PgPool;
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

/// A tenant whose database is ready and that only needs its control plane records.
pub struct TenantRegistration {
    pub request: NewTenantRequest,
    pub database_url: String,
}

/// Secrets generated for a new tenant, already encrypted or hashed for storage.
struct TenantCredentials {
    database_url_ciphertext: Vec<u8>,
    sealed_signing_key: SealedSigningKey,
    publishable_key: OpaqueToken,
    secret_key: OpaqueToken,
}

impl TenantCredentials {
    fn generate(database_url: &str, secret_box: &SecretBox) -> Result<Self, ProvisioningError> {
        Ok(Self {
            database_url_ciphertext: secret_box.seal(database_url.as_bytes())?,
            sealed_signing_key: SealedSigningKey::seal(&SigningKey::generate()?, secret_box)?,
            publishable_key: OpaqueToken::generate(ApiKeyKind::Publishable.token_prefix()),
            secret_key: OpaqueToken::generate(ApiKeyKind::Secret.token_prefix()),
        })
    }
}

struct StoredTenant<'a> {
    tenant_id: Uuid,
    request: &'a NewTenantRequest,
    credentials: &'a TenantCredentials,
}

pub async fn register_tenant(
    control_plane_pool: &PgPool,
    secret_box: &SecretBox,
    registration: TenantRegistration,
) -> Result<ProvisionedTenant, ProvisioningError> {
    let tenant_id = Uuid::new_v4();
    let credentials = TenantCredentials::generate(&registration.database_url, secret_box)?;
    let request = registration.request;
    let stored_tenant = StoredTenant {
        tenant_id,
        request: &request,
        credentials: &credentials,
    };
    store_tenant(control_plane_pool, stored_tenant).await?;

    Ok(ProvisionedTenant {
        tenant_id,
        slug: request.slug,
        publishable_key: credentials.publishable_key.plaintext,
        secret_key: credentials.secret_key.plaintext,
    })
}

/// The tenant row, its signing key and both API keys are written atomically.
async fn store_tenant(
    control_plane_pool: &PgPool,
    tenant: StoredTenant<'_>,
) -> Result<(), sqlx::Error> {
    let tenant_id = tenant.tenant_id;
    let request = tenant.request;
    let credentials = tenant.credentials;
    let new_tenant = NewTenant {
        tenant_id,
        slug: &request.slug,
        name: &request.name,
        site_url: &request.site_url,
        require_email_verification: request.require_email_verification,
        database_url_ciphertext: &credentials.database_url_ciphertext,
    };
    let publishable_owner = ApiKeyOwner {
        tenant_id,
        kind: ApiKeyKind::Publishable,
    };
    let secret_owner = ApiKeyOwner {
        tenant_id,
        kind: ApiKeyKind::Secret,
    };

    let mut transaction = control_plane_pool.begin().await?;
    insert_tenant(&mut transaction, new_tenant).await?;
    insert_active_signing_key(&mut transaction, tenant_id, &credentials.sealed_signing_key).await?;
    insert_api_key(
        &mut transaction,
        publishable_owner,
        &credentials.publishable_key.hash,
    )
    .await?;
    insert_api_key(&mut transaction, secret_owner, &credentials.secret_key.hash).await?;

    transaction.commit().await
}
