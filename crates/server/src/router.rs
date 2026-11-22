use std::time::Duration;

use axum::Router;
use axum::body::Bytes;
use axum::http::StatusCode;
use axum::http::header::{
    ACCEPT, AUTHORIZATION, CACHE_CONTROL, CONTENT_RANGE, CONTENT_TYPE, RETRY_AFTER,
};
use axum::http::{HeaderName, HeaderValue, Method};
use axum::middleware;
use axum::routing::get;
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::PropagateRequestIdLayer;
use tower_http::set_header::{SetRequestHeaderLayer, SetResponseHeaderLayer};
use tower_http::timeout::{RequestBodyTimeoutLayer, TimeoutLayer};
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_doc::ApiDoc;
use crate::app_state::AppState;
use crate::health;
use crate::modules::auth::routes::auth_routes::auth_routes;
use crate::modules::cache::routes::cache_routes::cache_routes;
use crate::modules::database::query::preferences::PREFER_HEADER;
use crate::modules::database::routes::database_routes::database_routes;
use crate::modules::notifications::routes::notifications_routes::notifications_routes;
use crate::modules::oauth::routes::oauth_routes::oauth_routes;
use crate::modules::storage::routes::storage_routes::storage_routes;
use crate::modules::team::routes::team_routes::team_routes;
use crate::modules::tenants::access::api_key_tenant::API_KEY_HEADER;
use crate::modules::tenants::access::tenant_admin::PROJECT_HEADER;
use crate::modules::tenants::routes::list_api_keys::NEXT_API_KEY_CURSOR;
use crate::modules::tenants::routes::tenants_routes::tenants_routes;
use crate::modules::webhooks::routes::webhooks_routes::webhooks_routes;
use crate::shared::http::request_id::{REQUEST_ID_HEADER, generate_request_id};
use crate::shared::http::request_span::request_span;
use crate::startup::request_limit::limit_client_requests;

/// Browsers keep a preflight answer this long (Chrome caps it at two hours), so cross-origin
/// calls with the `apikey` header skip the extra OPTIONS round trip.
const CORS_PREFLIGHT_MAX_AGE: Duration = Duration::from_secs(2 * 60 * 60);

const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const REQUEST_BODY_TIMEOUT: Duration = Duration::from_secs(30);

/// Public: SDK generators and the console read the API description here.
const OPENAPI_PATH: &str = "/openapi.json";
const OPENAPI_JSON: &[u8] = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/openapi.json"));

pub fn build_router(state: AppState) -> Router {
    let (router, _) = api_routes().split_for_parts();

    let router = router
        .route(OPENAPI_PATH, get(openapi_document))
        .route("/ready", get(health::readiness))
        .route(
            "/ops/webhooks/worker-health",
            get(crate::modules::webhooks::health::worker_health::worker_health),
        );

    with_http_layers(router, state.clone()).with_state(state)
}

async fn openapi_document() -> ([(HeaderName, &'static str); 1], Bytes) {
    (
        [(CONTENT_TYPE, "application/json")],
        Bytes::from_static(OPENAPI_JSON),
    )
}

/// Limits, timeouts, caching, access log, request ids and CORS, around every route. The limit
/// and timeouts are innermost, so their refusals still carry the request id and CORS headers.
fn with_http_layers(router: Router<AppState>, state: AppState) -> Router<AppState> {
    router
        .layer(middleware::from_fn_with_state(state, limit_client_requests))
        // A slow client cannot hold a request open: the body must arrive in time, and no
        // request outlives the longest legitimate work (a 30 s service query, plus margin).
        .layer(RequestBodyTimeoutLayer::new(REQUEST_BODY_TIMEOUT))
        .layer(TimeoutLayer::with_status_code(
            StatusCode::GATEWAY_TIMEOUT,
            REQUEST_TIMEOUT,
        ))
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
}

/// Every documented route: the path in each handler's `#[utoipa::path]` is the one served.
pub fn api_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(health::health))
        .merge(tenants_routes())
        .merge(team_routes())
        .merge(auth_routes())
        .merge(webhooks_routes())
        .merge(notifications_routes())
        .merge(oauth_routes())
        .merge(database_routes())
        .merge(cache_routes())
        .merge(storage_routes())
}

/// Browser apps of any origin call the API with the publishable key; no cookies are used,
/// so allowing any origin does not expose credentials.
fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([
            CONTENT_TYPE,
            AUTHORIZATION,
            HeaderName::from_static(API_KEY_HEADER),
            HeaderName::from_static(PROJECT_HEADER),
            HeaderName::from_static(PREFER_HEADER),
            ACCEPT,
        ])
        .expose_headers([
            REQUEST_ID_HEADER,
            CONTENT_RANGE,
            NEXT_API_KEY_CURSOR,
            RETRY_AFTER,
        ])
        .max_age(CORS_PREFLIGHT_MAX_AGE)
}
