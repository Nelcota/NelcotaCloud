use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::app_state::AppState;
use crate::modules::notifications::routes::change_notification_channel;
use crate::modules::notifications::routes::create_notification_channel;
use crate::modules::notifications::routes::delete_notification_channel;
use crate::modules::notifications::routes::list_notification_channels;
use crate::modules::notifications::routes::test_notification_channel;

/// Every endpoint of this module; `router.rs` merges it into the API.
pub fn notifications_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(
            list_notification_channels::list_notification_channels,
            create_notification_channel::create_notification_channel
        ))
        .routes(routes!(
            change_notification_channel::change_notification_channel,
            delete_notification_channel::delete_notification_channel
        ))
        .routes(routes!(
            test_notification_channel::test_notification_channel
        ))
}
