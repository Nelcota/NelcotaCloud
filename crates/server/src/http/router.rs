use axum::Router;
use axum::http::header::{AUTHORIZATION, CONTENT_TYPE};
use axum::http::{HeaderName, Method};
use axum::routing::{get, post, put};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::app_state::AppState;
use crate::http::routes::authorize_oauth::authorize_oauth;
use crate::http::routes::configure_oauth_provider::configure_oauth_provider;
use crate::http::routes::create_tenant::create_tenant;
use crate::http::routes::current_user::current_user;
use crate::http::routes::exchange_oauth_code::exchange_oauth_code;
use crate::http::routes::health::health;
use crate::http::routes::jwks::jwks;
use crate::http::routes::log_in::log_in;
use crate::http::routes::log_out::log_out;
use crate::http::routes::oauth_callback::oauth_callback;
use crate::http::routes::refresh_session::refresh_session;
use crate::http::routes::request_auth_email::{recover_password, resend_verification};
use crate::http::routes::reset_password::reset_password;
use crate::http::routes::sign_up::sign_up;
use crate::http::routes::tenant_settings::{change_tenant_settings, read_tenant_settings};
use crate::http::routes::verify_email::verify_email;
use crate::http::tenant_context::API_KEY_HEADER;

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/admin/v1/tenants", post(create_tenant))
        .route("/auth/v1/signup", post(sign_up))
        .route("/auth/v1/login", post(log_in))
        .route("/auth/v1/refresh", post(refresh_session))
        .route("/auth/v1/logout", post(log_out))
        .route("/auth/v1/user", get(current_user))
        .route("/auth/v1/jwks", get(jwks))
        .route("/auth/v1/verify-email", post(verify_email))
        .route("/auth/v1/verify-email/resend", post(resend_verification))
        .route("/auth/v1/recover", post(recover_password))
        .route("/auth/v1/reset-password", post(reset_password))
        .route(
            "/auth/v1/admin/oauth/{provider}",
            put(configure_oauth_provider),
        )
        .route(
            "/auth/v1/admin/settings",
            get(read_tenant_settings).patch(change_tenant_settings),
        )
        .route("/auth/v1/oauth/{provider}/authorize", get(authorize_oauth))
        .route("/auth/v1/oauth/callback", get(oauth_callback))
        .route("/auth/v1/oauth/token", post(exchange_oauth_code))
        .layer(TraceLayer::new_for_http())
        .layer(cors_layer())
        .with_state(state)
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
}
