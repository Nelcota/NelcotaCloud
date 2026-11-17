use std::future::ready;
use std::sync::Arc;
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
use crate::modules::auth::routes::auth_routes::auth_routes;
use crate::modules::oauth::routes::oauth_routes::oauth_routes;
use crate::modules::team::routes::team_routes::team_routes;
use crate::modules::tenants::access::api_key_tenant::API_KEY_HEADER;
use crate::modules::tenants::access::tenant_admin::PROJECT_HEADER;
use crate::modules::tenants::routes::tenants_routes::tenants_routes;
use crate::shared::http::request_id::{REQUEST_ID_HEADER, generate_request_id};
use crate::shared::http::request_span::request_span;

/// Browsers keep a preflight answer this long (Chrome caps it at two hours), so cross-origin
/// calls with the `apikey` header skip the extra OPTIONS round trip.
const CORS_PREFLIGHT_MAX_AGE: Duration = Duration::from_secs(2 * 60 * 60);

/// Public: SDK generators and the console read the API description here.
const OPENAPI_PATH: &str = "/openapi.json";

pub fn build_router(state: AppState) -> Router {
    let (router, document) = api_routes().split_for_parts();
    // Built once and shared by every request; only the pointer is cloned.
    let document = Arc::new(document);

    let router = router.route(
        OPENAPI_PATH,
        get(move || ready(Json(Arc::clone(&document)))),
    );

    with_http_layers(router).with_state(state)
}

/// Caching, access log, request ids and CORS, around every route.
fn with_http_layers(router: Router<AppState>) -> Router<AppState> {
    router
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
        .merge(oauth_routes())
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
        ])
        .expose_headers([REQUEST_ID_HEADER])
        .max_age(CORS_PREFLIGHT_MAX_AGE)
}
