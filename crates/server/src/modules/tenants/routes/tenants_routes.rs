use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::tenants::routes::block_address;
use crate::modules::tenants::routes::change_tenant_settings;
use crate::modules::tenants::routes::configure_captcha;
use crate::modules::tenants::routes::configure_smtp;
use crate::modules::tenants::routes::create_api_key;
use crate::modules::tenants::routes::create_project;
use crate::modules::tenants::routes::create_tenant;
use crate::modules::tenants::routes::delete_project;
use crate::modules::tenants::routes::delete_tenant;
use crate::modules::tenants::routes::list_api_keys;
use crate::modules::tenants::routes::list_blocked_addresses;
use crate::modules::tenants::routes::list_projects;
use crate::modules::tenants::routes::read_captcha_settings;
use crate::modules::tenants::routes::read_public_captcha;
use crate::modules::tenants::routes::read_smtp_settings;
use crate::modules::tenants::routes::read_tenant_settings;
use crate::modules::tenants::routes::remove_captcha;
use crate::modules::tenants::routes::reset_smtp;
use crate::modules::tenants::routes::revoke_api_key;
use crate::modules::tenants::routes::rotate_signing_key;
use crate::modules::tenants::routes::unblock_address;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn tenants_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(provisioning_routes())
        .merge(tenant_admin_routes())
}

/// Creating and deleting tenants: by the platform admin, or as console projects.
fn provisioning_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create_tenant::create_tenant))
        .routes(routes!(delete_tenant::delete_tenant))
        .routes(routes!(
            list_projects::list_projects,
            create_project::create_project
        ))
        .routes(routes!(delete_project::delete_project))
}

/// A tenant's own settings, keys, SMTP server, captcha and blocked addresses.
fn tenant_admin_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            read_tenant_settings::read_tenant_settings,
            change_tenant_settings::change_tenant_settings
        ))
        .routes(routes!(
            list_api_keys::list_api_keys,
            create_api_key::create_api_key
        ))
        .routes(routes!(revoke_api_key::revoke_api_key))
        .routes(routes!(rotate_signing_key::rotate_signing_key))
        .routes(routes!(
            list_blocked_addresses::list_blocked_addresses,
            block_address::block_address
        ))
        .routes(routes!(unblock_address::unblock_address))
        .routes(routes!(
            read_smtp_settings::read_smtp_settings,
            configure_smtp::configure_smtp,
            reset_smtp::reset_smtp
        ))
        .routes(routes!(
            read_captcha_settings::read_captcha_settings,
            configure_captcha::configure_captcha,
            remove_captcha::remove_captcha
        ))
        .routes(routes!(read_public_captcha::read_public_captcha))
}
