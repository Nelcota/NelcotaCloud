use utoipa::openapi::Components;
use utoipa::openapi::OpenApi as OpenApiDocument;
use utoipa::openapi::security::{ApiKey, ApiKeyValue, HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::modules::tenants::access::admin_access::ADMIN_TOKEN_HEADER;
use crate::modules::tenants::access::api_key_tenant::API_KEY_HEADER;
use crate::modules::tenants::access::tenant_admin::PROJECT_HEADER;
use crate::router::api_routes;

/// File the console generates its API types from; `export-openapi` rewrites it.
pub const OPENAPI_FILE: &str = "openapi.json";

#[derive(OpenApi)]
#[openapi(
    info(
        title = "NelcotaCloud API",
        description = "Multitenant Auth: every request names its tenant with an API key."
    ),
    modifiers(&SecuritySchemes),
    tags(
        (name = "auth", description = "Signup, login and sessions of a tenant's users"),
        (name = "mfa", description = "TOTP second factor of a tenant's users"),
        (name = "sessions", description = "Devices where a user is logged in"),
        (name = "oauth", description = "Login with Google or GitHub through the tenant's own OAuth app"),
        (name = "tenant-admin", description = "A tenant's own configuration (secret API key)"),
        (name = "platform", description = "Projects of a console account (platform access token)"),
        (name = "platform-admin", description = "Operations of the platform operator (admin token)"),
        (name = "system", description = "Health of the API")
    )
)]
pub struct ApiDoc;

/// The document the API serves at `/openapi.json`, built from the annotated routes.
pub fn openapi_document() -> OpenApiDocument {
    let (_, document) = api_routes().split_for_parts();

    document
}

struct SecuritySchemes;

impl Modify for SecuritySchemes {
    fn modify(&self, document: &mut OpenApiDocument) {
        let components = document.components.get_or_insert_with(Default::default);
        add_key_schemes(components);
        add_bearer_schemes(components);
    }
}

/// Credentials sent in their own headers: API keys, the admin token and the console project.
fn add_key_schemes(components: &mut Components) {
    let api_key = ApiKey::Header(ApiKeyValue::with_description(
        API_KEY_HEADER,
        "The tenant's publishable key (browser apps) or secret key (servers, admin routes)",
    ));
    let admin_token = ApiKey::Header(ApiKeyValue::new(ADMIN_TOKEN_HEADER));
    let project = ApiKey::Header(ApiKeyValue::with_description(
        PROJECT_HEADER,
        "Id of the project a console account manages; it must be a member",
    ));
    components.add_security_scheme("api_key", SecurityScheme::ApiKey(api_key));
    components.add_security_scheme("admin_token", SecurityScheme::ApiKey(admin_token));
    components.add_security_scheme("project", SecurityScheme::ApiKey(project));
}

/// Access tokens: of a tenant's users, and of console accounts.
fn add_bearer_schemes(components: &mut Components) {
    let bearer = HttpBuilder::new()
        .scheme(HttpAuthScheme::Bearer)
        .bearer_format("JWT")
        .build();
    let platform_account = HttpBuilder::new()
        .scheme(HttpAuthScheme::Bearer)
        .bearer_format("JWT")
        .description(Some(
            "Access token of a console account (a user of the platform tenant)",
        ))
        .build();
    components.add_security_scheme("bearer", SecurityScheme::Http(bearer));
    components.add_security_scheme("platform_account", SecurityScheme::Http(platform_account));
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    /// The console's types come from the committed file; regenerate it with
    /// `cargo run -p server --bin export-openapi` when this fails.
    #[test]
    fn committed_openapi_file_is_up_to_date() -> Result<(), Box<dyn std::error::Error>> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(OPENAPI_FILE);
        let committed = std::fs::read_to_string(path)?.replace("\r\n", "\n");
        let generated = openapi_document().to_pretty_json()?;

        assert_eq!(committed.trim_end(), generated.trim_end());
        Ok(())
    }
}
