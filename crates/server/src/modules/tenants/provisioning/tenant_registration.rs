use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_issuance::{ApiKeyRequest, issue_api_key};
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_repository::ApiKeyOwner;
use crate::modules::tenants::platform::membership_repository::{
    MAX_OWNED_PROJECTS, NewMembership, can_own_another_project, insert_membership,
};
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_provisioner::{
    NewTenantRequest, ProjectOwner, ProvisionedTenant,
};
use crate::modules::tenants::provisioning::tenant_repository::{NewTenant, insert_tenant};
use crate::modules::tenants::signing_keys::signing_key::SigningKey;
use crate::modules::tenants::signing_keys::signing_key_repository::{
    SealedSigningKey, insert_active_signing_key,
};
use crate::shared::crypto::secret_box::SecretBox;

/// Writes the tenant row, its signing key and both API keys inside the caller's transaction,
/// so they become visible together, or not at all.
pub async fn register_tenant(
    transaction: &mut PgConnection,
    secret_box: &SecretBox,
    request: NewTenantRequest,
) -> Result<ProvisionedTenant, ProvisioningError> {
    let tenant_id = Uuid::new_v4();
    let signing_key = SigningKey::generate()?;
    let sealed_signing_key = SealedSigningKey::seal(&signing_key, tenant_id, secret_box)?;
    insert_tenant(transaction, NewTenant::of(tenant_id, &request)).await?;
    add_owner(transaction, tenant_id, request.owner.as_ref()).await?;
    insert_active_signing_key(transaction, tenant_id, &sealed_signing_key).await?;
    let (publishable_key, secret_key) = issue_initial_keys(transaction, tenant_id).await?;

    Ok(ProvisionedTenant {
        tenant_id,
        slug: request.slug,
        publishable_key,
        secret_key,
    })
}

/// The publishable and secret keys every project starts with.
async fn issue_initial_keys(
    transaction: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(String, String), sqlx::Error> {
    let publishable = issue_api_key(transaction, initial_key(tenant_id, ApiKeyKind::Publishable));
    let publishable_key = publishable.await?.key;
    let secret_key = issue_api_key(transaction, initial_key(tenant_id, ApiKeyKind::Secret));

    Ok((publishable_key, secret_key.await?.key))
}

impl<'a> NewTenant<'a> {
    fn of(tenant_id: Uuid, request: &'a NewTenantRequest) -> Self {
        Self {
            tenant_id,
            slug: &request.slug,
            name: &request.name,
            site_url: &request.site_url,
            require_email_verification: request.require_email_verification,
        }
    }
}

/// The keys every project starts with; they have no name until the owner gives one.
fn initial_key(tenant_id: Uuid, kind: ApiKeyKind) -> ApiKeyRequest<'static> {
    ApiKeyRequest {
        owner: ApiKeyOwner { tenant_id, kind },
        name: "",
    }
}

async fn add_owner(
    transaction: &mut PgConnection,
    tenant_id: Uuid,
    owner: Option<&ProjectOwner>,
) -> Result<(), ProvisioningError> {
    let owner = match owner {
        Some(owner) => owner,
        None => return Ok(()),
    };

    if can_own_another_project(transaction, owner.account_id).await? == false {
        return Err(ProvisioningError::ProjectLimitReached(MAX_OWNED_PROJECTS));
    }

    let membership = NewMembership {
        tenant_id,
        account_id: owner.account_id,
        account_email: &owner.email,
        role: ProjectRole::Owner,
    };
    insert_membership(transaction, membership).await?;

    Ok(())
}
