use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::mfa::mfa_factor_repository::{
    PendingMfaFactor, mfa_secret_context, replace_pending_mfa_factor,
};
use crate::modules::auth::mfa::totp_code::{TotpLabel, new_totp_enrollment};
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// The authenticator to add to an app; it becomes active after its first code is verified.
#[derive(Serialize, ToSchema)]
pub struct TotpEnrollmentResponse {
    pub factor_id: Uuid,
    /// Base32 secret, for typing into an authenticator app by hand.
    pub secret: String,
    /// `otpauth://` URI, usually shown as a QR code.
    pub otpauth_uri: String,
}

/// `POST /mfa/totp`: starts adding a TOTP authenticator (replacing a pending one). Shown once.
#[utoipa::path(
    post,
    path = "/auth/v1/mfa/totp",
    tag = "mfa",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 201, description = "Authenticator created; verify it with a first code", body = TotpEnrollmentResponse),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
        (status = 409, description = "TOTP is already enabled", body = ErrorBody),
    )
)]
pub async fn enroll_totp(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
) -> Result<(StatusCode, Json<TotpEnrollmentResponse>), ApiError> {
    let tenant = &authenticated.tenant;
    let claims = &authenticated.claims;
    let tenant_id = tenant.tenant_id;
    let settings = load_tenant_settings(&state, tenant_id).await?;
    let label = TotpLabel {
        issuer: &settings.name,
        account: &claims.email,
    };
    let enrollment = new_totp_enrollment(&label).map_err(ApiError::internal)?;
    let factor_id = Uuid::new_v4();
    let secret_ciphertext = state
        .secret_box
        .seal(
            &enrollment.secret,
            &mfa_secret_context(tenant_id, factor_id),
        )
        .map_err(ApiError::internal)?;
    let factor = PendingMfaFactor {
        id: factor_id,
        user_id: claims.sub,
        secret_ciphertext: &secret_ciphertext,
    };
    let stored = replace_pending_mfa_factor(&tenant.pool, factor)
        .await
        .map_err(ApiError::internal)?;

    if stored == false {
        return Err(ApiError::Conflict(
            "TOTP is already enabled; disable it before adding another authenticator".to_owned(),
        ));
    }

    let response = TotpEnrollmentResponse {
        factor_id,
        secret: enrollment.secret_base32,
        otpauth_uri: enrollment.otpauth_uri,
    };

    Ok((StatusCode::CREATED, Json(response)))
}
