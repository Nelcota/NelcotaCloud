use axum::extract::DefaultBodyLimit;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::change_cache_settings;
use super::clear_cache;
use super::create_cache_credential;
use super::delete_cache_entry;
use super::get_cache_entry;
use super::read_cache_settings;
use super::revoke_cache_credential;
use super::set_cache_entry;
use crate::app_state::AppState;
use crate::modules::cache::entries::cache_payload::MAX_BODY_BYTES;

pub fn cache_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            read_cache_settings::read_cache_settings,
            change_cache_settings::change_cache_settings
        ))
        .routes(routes!(clear_cache::clear_cache))
        .routes(routes!(create_cache_credential::create_cache_credential))
        .routes(routes!(revoke_cache_credential::revoke_cache_credential))
        .routes(routes!(get_cache_entry::get_cache_entry))
        .routes(routes!(set_cache_entry::set_cache_entry))
        .routes(routes!(delete_cache_entry::delete_cache_entry))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
}
