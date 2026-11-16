use serde::Serialize;
use sqlx::PgConnection;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::modules::auth::session::access_token::{
    AccessTokenClaims, AccessTokenError, sign_access_token,
};
use crate::modules::auth::session::refresh_token_repository::{
    NewRefreshToken, insert_refresh_token,
};
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;
use crate::shared::crypto::opaque_token::OpaqueToken;
use crate::shared::time::expiry::{ExpiryOutOfRange, expiry_after};

const ACCESS_TOKEN_LIFETIME: Duration = Duration::minutes(15);
const REFRESH_TOKEN_LIFETIME: Duration = Duration::days(30);
const REFRESH_TOKEN_PREFIX: &str = "nc_rt_";
const TOKEN_TYPE: &str = "bearer";

#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error(transparent)]
    AccessToken(#[from] AccessTokenError),
    #[error("database error while storing refresh token: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Expiry(#[from] ExpiryOutOfRange),
}

#[derive(Debug, Serialize)]
pub struct SessionTokens {
    pub access_token: String,
    pub token_type: &'static str,
    pub expires_in: i64,
    pub refresh_token: String,
    pub user: User,
}

/// Everything needed to issue tokens on behalf of one tenant.
pub struct SessionIssuer<'a> {
    pub tenant_id: Uuid,
    pub issuer: &'a str,
    pub signing_key: &'a PreparedSigningKey,
}

impl SessionIssuer<'_> {
    /// `family` groups every rotation of one login, so reuse can revoke the whole chain. The
    /// refresh token is written on `connection`, so callers can do it inside their transaction.
    pub async fn issue(
        &self,
        connection: &mut PgConnection,
        user: User,
        family: SessionFamily,
    ) -> Result<SessionTokens, SessionError> {
        let now = OffsetDateTime::now_utc();
        let claims = AccessTokenClaims {
            sub: user.id,
            aud: self.tenant_id.to_string(),
            iss: self.issuer.to_owned(),
            iat: now.unix_timestamp(),
            exp: expiry_after(now, ACCESS_TOKEN_LIFETIME)?.unix_timestamp(),
            email: user.email.clone(),
        };
        let access_token = sign_access_token(&claims, self.signing_key)?;
        let refresh_token = OpaqueToken::generate(REFRESH_TOKEN_PREFIX);
        let new_refresh_token = NewRefreshToken {
            user_id: user.id,
            family,
            token_hash: &refresh_token.hash,
            lifetime_seconds: REFRESH_TOKEN_LIFETIME.whole_seconds(),
        };
        insert_refresh_token(connection, new_refresh_token).await?;

        Ok(SessionTokens {
            access_token,
            token_type: TOKEN_TYPE,
            expires_in: ACCESS_TOKEN_LIFETIME.whole_seconds(),
            refresh_token: refresh_token.plaintext,
            user,
        })
    }
}
