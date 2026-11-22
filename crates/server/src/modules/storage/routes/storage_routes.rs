use axum::extract::DefaultBodyLimit;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{
    complete_upload, create_bucket, delete_bucket, delete_object, download_url, list_buckets,
    list_objects, start_upload,
};
use crate::app_state::AppState;

pub fn storage_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            list_buckets::list_buckets,
            create_bucket::create_bucket
        ))
        .routes(routes!(delete_bucket::delete_bucket))
        .routes(routes!(list_objects::list_objects))
        .routes(routes!(start_upload::start_upload))
        .routes(routes!(complete_upload::complete_upload))
        .routes(routes!(download_url::download_url))
        .routes(routes!(delete_object::delete_object))
        .layer(DefaultBodyLimit::max(16 * 1024))
}
