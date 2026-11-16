use axum::Json;
use axum::extract::State;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::routes::verify_email::OneTimeTokenBody;
use crate::modules::auth::session::refresh_token_repository::end_all_user_sessions;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, SessionRequest};
use crate::modules::auth::user::user_account_updates::claim_account_for_verified_email;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /magic-link/verify`: trades the token from the emailed link for a session.
///
/// Opening the link proves control of the inbox. On an account nobody verified, whoever set
/// its password may not own the email, so the password is dropped and its sessions end.
#[utoipa::path(
    post,
    path = "/auth/v1/magic-link/verify",
    tag = "auth",
    security(("api_key" = [])),
    request_body = OneTimeTokenBody,
    responses(
        (status = 200, description = "Logged in, or the MFA step that must come first", body = LoginResponse),
        (status = 400, description = "Invalid, used or expired link", body = ErrorBody),
        (status = 403, description = "The user is banned", body = ErrorBody),
    )
)]
pub async fn verify_magic_link(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OneTimeTokenBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    let user = claim_magic_link(&tenant, &body.token).await?;
    // A new connection, after the claim committed: the session starts after its invalidation.
    let mut connection = tenant.pool.acquire().await.map_err(ApiError::internal)?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    Ok(Json(complete_login(&state, request).await?))
}

async fn claim_magic_link(tenant: &TenantContext, token: &str) -> Result<User, ApiError> {
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let purpose = OneTimeTokenPurpose::MagicLink;
    let consumed = consume_one_time_token(&mut transaction, purpose, token)
        .await
        .map_err(ApiError::internal)?;
    let Some(consumed) = consumed else {
        return Err(ApiError::InvalidToken);
    };
    let user = verify_inbox_owner(&mut transaction, consumed.user_id).await?;
    transaction.commit().await.map_err(ApiError::internal)?;

    Ok(user)
}

async fn verify_inbox_owner(
    transaction: &mut PgConnection,
    user_id: Uuid,
) -> Result<User, ApiError> {
    let user = find_user_by_id(&mut *transaction, user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidToken);
    };

    if user.email_verified_at.is_some() {
        return Ok(user);
    }

    let claimed = claim_account_for_verified_email(transaction, user_id)
        .await
        .map_err(ApiError::internal)?;
    end_all_user_sessions(transaction, user_id)
        .await
        .map_err(ApiError::internal)?;
    delete_mfa_factor(&mut *transaction, user_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(claimed)
}
