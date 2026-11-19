use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::webhooks::routes::change_webhook_endpoint;
use crate::modules::webhooks::routes::create_webhook_endpoint;
use crate::modules::webhooks::routes::delete_webhook_endpoint;
use crate::modules::webhooks::routes::list_webhook_deliveries;
use crate::modules::webhooks::routes::list_webhook_endpoints;
use crate::modules::webhooks::routes::read_webhook_queue_health;
use crate::modules::webhooks::routes::retry_webhook_delivery;
use crate::modules::webhooks::routes::rotate_webhook_secret;
use crate::modules::webhooks::routes::send_test_webhook;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn webhooks_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            list_webhook_endpoints::list_webhook_endpoints,
            create_webhook_endpoint::create_webhook_endpoint
        ))
        .routes(routes!(
            change_webhook_endpoint::change_webhook_endpoint,
            delete_webhook_endpoint::delete_webhook_endpoint
        ))
        .routes(routes!(rotate_webhook_secret::rotate_webhook_secret))
        .routes(routes!(send_test_webhook::send_test_webhook))
        .routes(routes!(list_webhook_deliveries::list_webhook_deliveries))
        .routes(routes!(retry_webhook_delivery::retry_webhook_delivery))
        .routes(routes!(
            read_webhook_queue_health::read_webhook_queue_health
        ))
}
