use std::future::ready;
use std::time::Duration;

use axum::http::header::{AUTHORIZATION, CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderName, HeaderValue, Method};
use axum::routing::get;
use axum::{Json, Router};
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::PropagateRequestIdLayer;
use tower_http::set_header::{SetRequestHeaderLayer, SetResponseHeaderLayer};
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_doc::ApiDoc;
use crate::app_state::AppState;
use crate::health;
use crate::modules::auth::routes::current_user;
use crate::modules::auth::routes::jwks;
use crate::modules::auth::routes::log_in;
use crate::modules::auth::routes::log_out;
use crate::modules::auth::routes::recover_password;
use crate::modules::auth::routes::refresh_session;
use crate::modules::auth::routes::resend_verification;
use crate::modules::auth::routes::reset_password;
use crate::modules::auth::routes::sign_up;
use crate::modules::auth::routes::verify_email;
use crate::modules::oauth::routes::authorize_oauth;
use crate::modules::oauth::routes::configure_oauth_provider;
use crate::modules::oauth::routes::exchange_oauth_code;
use crate::modules::oauth::routes::oauth_callback;
use crate::modules::tenants::access::api_key_tenant::API_KEY_HEADER;
use crate::modules::tenants::routes::change_tenant_settings;
use crate::modules::tenants::routes::create_tenant;
use crate::modules::tenants::routes::read_tenant_settings;
use crate::shared::http::request_id::{REQUEST_ID_HEADER, generate_request_id};
use crate::shared::http::request_span::request_span;

/// Browsers keep a preflight answer this long (Chrome caps it at two hours), so cross-origin
/// calls with the `apikey` header skip the extra OPTIONS round trip.
const CORS_PREFLIGHT_MAX_AGE: Duration = Duration::from_secs(2 * 60 * 60);

/// Public: SDK generators and the console read the API description here.
const OPENAPI_PATH: &str = "/openapi.json";

pub fn build_router(state: AppState) -> Router {
    let (router, document) = api_routes().split_for_parts();

    router
        .route(OPENAPI_PATH, get(move || ready(Json(document.clone()))))
        // Responses carry tokens and personal data: no browser, proxy or CDN may keep a copy
        // (RFC 6749, section 5.1). A route that sets its own Cache-Control keeps it.
        .layer(SetResponseHeaderLayer::if_not_present(
            CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ))
        // Access log: one INFO line per response (status, latency) inside the request span;
        // server errors are also logged at ERROR by the default failure handler.
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(request_span)
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(PropagateRequestIdLayer::new(REQUEST_ID_HEADER))
        .layer(SetRequestHeaderLayer::overriding(
            REQUEST_ID_HEADER,
            generate_request_id,
        ))
        .layer(cors_layer())
        .with_state(state)
}

/// Every documented route: the path in each handler's `#[utoipa::path]` is the one served.
pub fn api_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(health::health))
        .routes(routes!(create_tenant::create_tenant))
        .routes(routes!(sign_up::sign_up))
        .routes(routes!(log_in::log_in))
        .routes(routes!(refresh_session::refresh_session))
        .routes(routes!(log_out::log_out))
        .routes(routes!(current_user::current_user))
        .routes(routes!(jwks::jwks))
        .routes(routes!(verify_email::verify_email))
        .routes(routes!(resend_verification::resend_verification))
        .routes(routes!(recover_password::recover_password))
        .routes(routes!(reset_password::reset_password))
        .routes(routes!(configure_oauth_provider::configure_oauth_provider))
        .routes(routes!(
            read_tenant_settings::read_tenant_settings,
            change_tenant_settings::change_tenant_settings
        ))
        .routes(routes!(authorize_oauth::authorize_oauth))
        .routes(routes!(oauth_callback::oauth_callback))
        .routes(routes!(exchange_oauth_code::exchange_oauth_code))
}

/// Browser apps of any origin call the API with the publishable key; no cookies are used,
/// so allowing any origin does not expose credentials.
fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH])
        .allow_headers([
            CONTENT_TYPE,
            AUTHORIZATION,
            HeaderName::from_static(API_KEY_HEADER),
        ])
        .expose_headers([REQUEST_ID_HEADER])
        .max_age(CORS_PREFLIGHT_MAX_AGE)
}
