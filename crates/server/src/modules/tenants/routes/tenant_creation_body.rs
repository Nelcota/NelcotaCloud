use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_provisioner::{
    NewTenantRequest, ProjectOwner, ProvisionedTenant,
};
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::http::api_error::ApiError;
use crate::shared::text::single_line::check_single_line;

#[derive(Deserialize, Validate, ToSchema)]
pub struct CreateTenantBody {
    #[validate(length(min = 3, max = 40))]
    pub slug: String,
    #[validate(length(min = 1, max = 100), custom(function = check_single_line))]
    pub name: String,
    #[validate(length(min = 1, max = 2048))]
    pub site_url: String,
    /// Defaults to true: only verified emails can log in with a password.
    pub require_email_verification: Option<bool>,
}

#[derive(Serialize, ToSchema)]
pub struct CreatedTenantResponse {
    pub tenant_id: Uuid,
    pub slug: String,
    pub publishable_key: String,
    pub secret_key: String,
}

impl CreateTenantBody {
    /// Validates the body; with an `owner`, that platform account becomes the owner of the new
    /// tenant in the same transaction.
    pub fn into_request(self, owner: Option<ProjectOwner>) -> Result<NewTenantRequest, ApiError> {
        let slug = TenantSlug::parse(&self.slug).map_err(ApiError::invalid_request)?;
        let site_url = SiteUrl::parse(&self.site_url).map_err(ApiError::invalid_request)?;
        let name = self.name.trim();

        if name.is_empty() {
            return Err(ApiError::InvalidRequest(
                "name must not be blank".to_owned(),
            ));
        }

        Ok(NewTenantRequest {
            slug,
            name: name.to_owned(),
            site_url,
            require_email_verification: self.require_email_verification.unwrap_or(true),
            owner,
        })
    }
}

impl From<ProvisionedTenant> for CreatedTenantResponse {
    fn from(provisioned: ProvisionedTenant) -> Self {
        Self {
            tenant_id: provisioned.tenant_id,
            slug: provisioned.slug.as_str().to_owned(),
            publishable_key: provisioned.publishable_key,
            secret_key: provisioned.secret_key,
        }
    }
}

pub async fn provision_tenant(
    state: &AppState,
    request: NewTenantRequest,
) -> Result<CreatedTenantResponse, ApiError> {
    let provisioned = state.tenant_provisioner().provision(request).await;

    Ok(CreatedTenantResponse::from(
        provisioned.map_err(map_provisioning_error)?,
    ))
}

fn map_provisioning_error(error: ProvisioningError) -> ApiError {
    match error {
        ProvisioningError::Busy => ApiError::ServiceBusy,
        ProvisioningError::SlugTaken => ApiError::from(TenantsRejection::SlugTaken),
        error @ ProvisioningError::ProjectLimitReached(_) => ApiError::Conflict(error.to_string()),
        other => ApiError::internal(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(slug: &str, name: &str, site_url: &str) -> CreateTenantBody {
        CreateTenantBody {
            slug: slug.to_owned(),
            name: name.to_owned(),
            site_url: site_url.to_owned(),
            require_email_verification: None,
        }
    }

    #[test]
    fn requires_verification_unless_told_otherwise() -> Result<(), ApiError> {
        let request = body("acme", " Acme ", "https://app.acme.test").into_request(None)?;

        assert!(request.require_email_verification);
        assert_eq!(request.name, "Acme");
        assert_eq!(request.owner, None);
        Ok(())
    }

    #[test]
    fn keeps_the_owner_and_an_explicit_choice() -> Result<(), ApiError> {
        let owner = ProjectOwner {
            account_id: Uuid::new_v4(),
            email: "owner@example.com".to_owned(),
        };
        let mut sent = body("acme", "Acme", "https://app.acme.test");
        sent.require_email_verification = Some(false);
        let request = sent.into_request(Some(owner.clone()))?;

        assert!(request.require_email_verification == false);
        assert_eq!(request.owner, Some(owner));
        Ok(())
    }

    #[test]
    fn refuses_blank_names_bad_slugs_and_unsafe_site_urls() {
        let invalid = [
            body("acme", "   ", "https://app.acme.test"),
            body("Not A Slug!", "Acme", "https://app.acme.test"),
            body("acme", "Acme", "javascript:alert(1)"),
        ];

        for sent in invalid {
            let refused = sent.into_request(None);
            assert!(matches!(refused, Err(ApiError::InvalidRequest(_))));
        }
    }
}
