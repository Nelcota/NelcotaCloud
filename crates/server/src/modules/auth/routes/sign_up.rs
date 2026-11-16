use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::{
    AuthEmailKind, AuthEmailRequest, send_auth_email,
};
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::User;
use crate::modules::auth::user::user_registration::{InsertUserError, insert_user};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct SignUpBody {
    /// Format is checked by `EmailAddress::parse`, after trimming and lowercasing.
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// A session when the tenant lets unverified users in; otherwise only a note to check the inbox.
#[derive(Serialize)]
#[serde(untagged)]
pub enum SignUpResponse {
    Session(SessionTokens),
    VerificationPending { verification_required: bool },
}

type SignUpResult = Result<(StatusCode, Json<SignUpResponse>), ApiError>;

pub async fn sign_up(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<SignUpBody>,
) -> SignUpResult {
    let email = EmailAddress::parse(&body.email).map_err(ApiError::invalid_request)?;
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
    let settings = load_tenant_settings(&state, tenant.tenant_id).await?;
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    let insertion = insert_user(&tenant.pool, &email, &password_hash).await;

    if settings.require_email_verification {
        return sign_up_pending_verification(&state, &tenant, insertion).await;
    }

    let user = insertion.map_err(map_insert_user_error)?;
    send_verification_email(&state, &tenant, &user).await?;
    let grant = SessionGrant {
        user,
        family_id: Uuid::new_v4(),
    };
    let tokens = issue_session(&state, &tenant, grant).await?;

    Ok((StatusCode::CREATED, Json(SignUpResponse::Session(tokens))))
}

/// Answers the same for new and already registered emails, so signup cannot be used to find
/// out which emails have accounts. The owner of an existing account receives nothing new.
async fn sign_up_pending_verification(
    state: &AppState,
    tenant: &TenantContext,
    insertion: Result<User, InsertUserError>,
) -> SignUpResult {
    let pending = SignUpResponse::VerificationPending {
        verification_required: true,
    };
    let user = match insertion {
        Ok(user) => user,
        Err(InsertUserError::EmailTaken) => return Ok((StatusCode::ACCEPTED, Json(pending))),
        Err(InsertUserError::Database(error)) => return Err(ApiError::internal(error)),
    };
    send_verification_email(state, tenant, &user).await?;

    Ok((StatusCode::ACCEPTED, Json(pending)))
}

async fn send_verification_email(
    state: &AppState,
    tenant: &TenantContext,
    user: &User,
) -> Result<(), ApiError> {
    let verification = AuthEmailRequest {
        user,
        kind: AuthEmailKind::Verification,
    };

    send_auth_email(state, tenant, verification).await
}

fn map_insert_user_error(error: InsertUserError) -> ApiError {
    match error {
        InsertUserError::EmailTaken => ApiError::EmailTaken,
        InsertUserError::Database(database_error) => ApiError::internal(database_error),
    }
}
