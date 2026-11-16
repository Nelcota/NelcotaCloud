use jsonwebtoken::{Algorithm, Header, Validation, decode, decode_header, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::control_plane::signing_key::{SigningKey, SigningKeyError};

const REQUIRED_CLAIMS: [&str; 4] = ["exp", "aud", "iss", "sub"];

#[derive(Debug, thiserror::Error)]
pub enum AccessTokenError {
    #[error("access token has no key id")]
    MissingKeyId,
    #[error("access token was signed by an unknown key")]
    UnknownKeyId,
    #[error("access token is invalid: {0}")]
    Invalid(#[from] jsonwebtoken::errors::Error),
    #[error(transparent)]
    SigningKey(#[from] SigningKeyError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: Uuid,
    /// The tenant id: a token from one tenant is rejected by every other tenant.
    pub aud: String,
    pub iss: String,
    pub iat: i64,
    pub exp: i64,
    pub email: String,
}

/// What a valid token must have been issued for.
pub struct TokenAudience<'a> {
    pub issuer: &'a str,
    pub tenant_id: Uuid,
}

pub fn sign_access_token(
    claims: &AccessTokenClaims,
    signing_key: &SigningKey,
) -> Result<String, AccessTokenError> {
    let mut header = Header::new(Algorithm::EdDSA);
    header.kid = Some(signing_key.key_id.to_string());

    Ok(encode(&header, claims, &signing_key.encoding_key())?)
}

pub fn verify_access_token(
    token: &str,
    signing_keys: &[SigningKey],
    audience: &TokenAudience,
) -> Result<AccessTokenClaims, AccessTokenError> {
    let header = decode_header(token)?;
    let Some(key_id) = header.kid else {
        return Err(AccessTokenError::MissingKeyId);
    };
    let Some(signing_key) = signing_keys
        .iter()
        .find(|key| key.key_id.to_string() == key_id)
    else {
        return Err(AccessTokenError::UnknownKeyId);
    };
    let mut validation = Validation::new(Algorithm::EdDSA);
    validation.set_audience(&[audience.tenant_id]);
    validation.set_issuer(&[audience.issuer]);
    validation.set_required_spec_claims(&REQUIRED_CLAIMS);
    let token_data = decode::<AccessTokenClaims>(token, &signing_key.decoding_key()?, &validation)?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use time::{Duration, OffsetDateTime};

    use super::*;

    const ISSUER: &str = "http://localhost/auth/v1";

    fn claims_for(tenant_id: Uuid, lifetime: Duration) -> AccessTokenClaims {
        let now = OffsetDateTime::now_utc();

        AccessTokenClaims {
            sub: Uuid::new_v4(),
            aud: tenant_id.to_string(),
            iss: ISSUER.to_owned(),
            iat: now.unix_timestamp(),
            exp: (now + lifetime).unix_timestamp(),
            email: "ana@example.com".to_owned(),
        }
    }

    #[test]
    fn accepts_token_for_same_tenant() -> Result<(), AccessTokenError> {
        let signing_key = SigningKey::generate()?;
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(5));
        let token = sign_access_token(&claims, &signing_key)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        let verified = verify_access_token(&token, &[signing_key], &audience)?;

        assert_eq!(verified.sub, claims.sub);
        Ok(())
    }

    #[test]
    fn rejects_token_for_other_tenant() -> Result<(), AccessTokenError> {
        let signing_key = SigningKey::generate()?;
        let claims = claims_for(Uuid::new_v4(), Duration::minutes(5));
        let token = sign_access_token(&claims, &signing_key)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id: Uuid::new_v4(),
        };

        assert!(verify_access_token(&token, &[signing_key], &audience).is_err());
        Ok(())
    }

    #[test]
    fn rejects_expired_token() -> Result<(), AccessTokenError> {
        let signing_key = SigningKey::generate()?;
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(-10));
        let token = sign_access_token(&claims, &signing_key)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        assert!(verify_access_token(&token, &[signing_key], &audience).is_err());
        Ok(())
    }

    #[test]
    fn rejects_token_signed_by_unknown_key() -> Result<(), AccessTokenError> {
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(5));
        let token = sign_access_token(&claims, &SigningKey::generate()?)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        let verification = verify_access_token(&token, &[SigningKey::generate()?], &audience);

        assert!(matches!(verification, Err(AccessTokenError::UnknownKeyId)));
        Ok(())
    }
}
