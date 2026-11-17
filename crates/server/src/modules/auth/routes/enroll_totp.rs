use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::mfa::factor_enrollment::{
    EnrolledFactor, FactorEnrollment, FactorEnrollmentError, enroll_factor,
};
use crate::modules::auth::mfa::totp_code::TotpLabel;
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
    let settings = load_tenant_settings(&state.control_plane_pool, tenant_id).await?;
    let request = FactorEnrollment {
        tenant_id,
        user_id: claims.sub,
        label: TotpLabel {
            issuer: &settings.name,
            account: &claims.email,
        },
    };
    let enrolled = enroll_factor(&tenant.pool, &state.secret_box, request)
        .await
        .map_err(map_enrollment_error)?;

    Ok((
        StatusCode::CREATED,
        Json(TotpEnrollmentResponse::from(enrolled)),
    ))
}

impl From<EnrolledFactor> for TotpEnrollmentResponse {
    fn from(enrolled: EnrolledFactor) -> Self {
        let enrollment = enrolled.enrollment;

        Self {
            factor_id: enrolled.factor_id,
            secret: enrollment.secret_base32,
            otpauth_uri: enrollment.otpauth_uri,
        }
    }
}

fn map_enrollment_error(error: FactorEnrollmentError) -> ApiError {
    match error {
        FactorEnrollmentError::AlreadyEnabled => ApiError::Conflict(
            "TOTP is already enabled; disable it before adding another authenticator".to_owned(),
        ),
        other => ApiError::internal(other),
    }
}

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;

    use super::*;

    #[test]
    fn an_active_authenticator_is_a_conflict_not_a_failure() {
        let conflict = map_enrollment_error(FactorEnrollmentError::AlreadyEnabled);
        let failure =
            map_enrollment_error(FactorEnrollmentError::Database(sqlx::Error::RowNotFound));

        assert_eq!(conflict.into_response().status(), StatusCode::CONFLICT);
        assert_eq!(
            failure.into_response().status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }
}
