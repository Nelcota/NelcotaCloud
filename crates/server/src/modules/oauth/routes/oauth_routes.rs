use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::oauth::routes::authorize_oauth;
use crate::modules::oauth::routes::configure_oauth_provider;
use crate::modules::oauth::routes::configure_oauth_redirects;
use crate::modules::oauth::routes::exchange_oauth_code;
use crate::modules::oauth::routes::list_oauth_providers;
use crate::modules::oauth::routes::list_user_identities;
use crate::modules::oauth::routes::oauth_callback;
use crate::modules::oauth::routes::remove_oauth_provider;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn oauth_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(list_oauth_providers::list_oauth_providers))
        .routes(routes!(
            configure_oauth_redirects::configure_oauth_redirects
        ))
        .routes(routes!(
            configure_oauth_provider::configure_oauth_provider,
            remove_oauth_provider::remove_oauth_provider
        ))
        .routes(routes!(authorize_oauth::authorize_oauth))
        .routes(routes!(oauth_callback::oauth_callback))
        .routes(routes!(exchange_oauth_code::exchange_oauth_code))
        .routes(routes!(list_user_identities::list_user_identities))
}
