use sqlx::PgPool;

use crate::modules::auth::integration::oauth_identity::{
    LoginResponse, OneTimeTokenPurpose, SessionFamily, SessionGrant, SessionRequest, TokenSigning,
    complete_login, consume_one_time_token, find_user_by_id,
};
use crate::modules::oauth::login::app_pkce::verifier_matches;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, is_current_revision,
};
use crate::modules::oauth::rejection::oauth_rejection::OAuthRejection;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// The one-time code from the OAuth redirect and the app's PKCE verifier for it.
pub struct LoginCodeExchange<'a> {
    pub code: &'a str,
    pub code_verifier: &'a str,
}

/// Trades the code for a session. The code is consumed even when the verifier is wrong, so it
/// cannot be guessed against.
pub async fn exchange_login_code(
    control_plane_pool: &PgPool,
    signing: &TokenSigning<'_>,
    tenant: &TenantContext,
    exchange: LoginCodeExchange<'_>,
) -> Result<LoginResponse, ApiError> {
    let mut transaction = tenant.pool.begin().await?;
    let purpose = OneTimeTokenPurpose::OAuthLogin;
    let consumed = consume_one_time_token(&mut transaction, purpose, exchange.code)
        .await?
        .ok_or(OAuthRejection::InvalidOAuthCode)?;
    let is_valid = consumed
        .code_challenge
        .as_deref()
        .is_some_and(|challenge| verifier_matches(exchange.code_verifier, challenge));

    if is_valid == false {
        transaction.commit().await?;
        return Err(OAuthRejection::InvalidOAuthCode.into());
    }

    let context = consumed.oauth_context.and_then(|(provider, revision)| {
        OAuthProvider::parse(&provider).map(|provider| (provider, revision))
    });
    let Some((provider, revision)) = context else {
        transaction.commit().await?;
        return Err(OAuthRejection::InvalidOAuthCode.into());
    };
    let key = ProviderKey {
        tenant_id: tenant.tenant_id,
        provider,
    };

    if is_current_revision(control_plane_pool, key, revision).await? == false {
        transaction.commit().await?;
        return Err(OAuthRejection::InvalidOAuthCode.into());
    }

    let user = find_user_by_id(&mut *transaction, consumed.user_id).await?;
    let user = user.ok_or(OAuthRejection::InvalidOAuthCode)?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut transaction,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    let response = complete_login(signing, request).await?;
    transaction.commit().await?;

    Ok(response)
}
