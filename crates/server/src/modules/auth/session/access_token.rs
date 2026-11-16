use jsonwebtoken::{Algorithm, Header, Validation, decode, decode_header, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;
use crate::modules::tenants::signing_keys::tenant_signing_keys::TenantSigningKeys;

const REQUIRED_CLAIMS: [&str; 4] = ["exp", "aud", "iss", "sub"];
/// Tolerated clock difference with other servers verifying our tokens. Explicit because the
/// library default (60 s) would silently accept tokens expired for a whole minute.
const EXPIRY_LEEWAY_SECONDS: u64 = 30;

#[derive(Debug, thiserror::Error)]
pub enum AccessTokenError {
    #[error("access token has no key id")]
    MissingKeyId,
    #[error("access token was signed by an unknown key")]
    UnknownKeyId,
    #[error("access token is invalid: {0}")]
    Invalid(#[from] jsonwebtoken::errors::Error),
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
    signing_key: &PreparedSigningKey,
) -> Result<String, AccessTokenError> {
    let mut header = Header::new(Algorithm::EdDSA);
    header.kid = Some(signing_key.key_id.to_string());

    Ok(encode(&header, claims, &signing_key.encoding_key)?)
}

pub fn verify_access_token(
    token: &str,
    signing_keys: &TenantSigningKeys,
    audience: &TokenAudience,
) -> Result<AccessTokenClaims, AccessTokenError> {
    let header = decode_header(token)?;
    let Some(raw_key_id) = header.kid else {
        return Err(AccessTokenError::MissingKeyId);
    };
    let Ok(key_id) = Uuid::parse_str(&raw_key_id) else {
        return Err(AccessTokenError::UnknownKeyId);
    };
    let Some(signing_key) = signing_keys.find(key_id) else {
        return Err(AccessTokenError::UnknownKeyId);
    };
    let mut validation = Validation::new(Algorithm::EdDSA);
    validation.set_audience(&[audience.tenant_id]);
    validation.set_issuer(&[audience.issuer]);
    validation.set_required_spec_claims(&REQUIRED_CLAIMS);
    validation.leeway = EXPIRY_LEEWAY_SECONDS;
    let token_data = decode::<AccessTokenClaims>(token, &signing_key.decoding_key, &validation)?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use time::{Duration, OffsetDateTime};

    use super::*;
    use crate::modules::tenants::signing_keys::signing_key::SigningKey;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn tenant_keys() -> Result<TenantSigningKeys, Box<dyn std::error::Error>> {
        let active = PreparedSigningKey::prepare(&SigningKey::generate()?)?;

        Ok(TenantSigningKeys::new(active, Vec::new())?)
    }

    const ISSUER: &str = "http://localhost/auth/v1";

    fn claims_for(tenant_id: Uuid, lifetime: Duration) -> AccessTokenClaims {
        let now = OffsetDateTime::now_utc();

        AccessTokenClaims {
            sub: Uuid::new_v4(),
            aud: tenant_id.to_string(),
            iss: ISSUER.to_owned(),
            iat: now.unix_timestamp(),
            exp: now
                .unix_timestamp()
                .saturating_add(lifetime.whole_seconds()),
            email: "ana@example.com".to_owned(),
        }
    }

    #[test]
    fn accepts_token_for_same_tenant() -> TestResult {
        let signing_keys = tenant_keys()?;
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(5));
        let token = sign_access_token(&claims, &signing_keys.active)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        let verified = verify_access_token(&token, &signing_keys, &audience)?;

        assert_eq!(verified.sub, claims.sub);
        Ok(())
    }

    #[test]
    fn rejects_token_for_other_tenant() -> TestResult {
        let signing_keys = tenant_keys()?;
        let claims = claims_for(Uuid::new_v4(), Duration::minutes(5));
        let token = sign_access_token(&claims, &signing_keys.active)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id: Uuid::new_v4(),
        };

        assert!(verify_access_token(&token, &signing_keys, &audience).is_err());
        Ok(())
    }

    #[test]
    fn rejects_expired_token() -> TestResult {
        let signing_keys = tenant_keys()?;
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(-10));
        let token = sign_access_token(&claims, &signing_keys.active)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        assert!(verify_access_token(&token, &signing_keys, &audience).is_err());
        Ok(())
    }

    #[test]
    fn rejects_token_signed_by_unknown_key() -> TestResult {
        let tenant_id = Uuid::new_v4();
        let claims = claims_for(tenant_id, Duration::minutes(5));
        let token = sign_access_token(&claims, &tenant_keys()?.active)?;
        let audience = TokenAudience {
            issuer: ISSUER,
            tenant_id,
        };

        let verification = verify_access_token(&token, &tenant_keys()?, &audience);

        assert_matches!(verification, Err(AccessTokenError::UnknownKeyId));
        Ok(())
    }
}
