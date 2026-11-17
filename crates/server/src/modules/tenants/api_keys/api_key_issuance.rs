use serde::Serialize;
use sqlx::PgConnection;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_repository::{
    ApiKeyOwner, StoredApiKey, insert_api_key,
};
use crate::shared::crypto::opaque_token::OpaqueToken;

/// Characters of the key kept in clear, enough to tell keys apart in a list.
const KEY_HINT_LENGTH: usize = 4;

/// A new key. Its plaintext is shown only here; afterwards only its hash exists.
#[derive(Debug, Serialize, ToSchema)]
pub struct IssuedApiKey {
    pub id: Uuid,
    /// `publishable` or `secret`.
    pub kind: &'static str,
    pub name: String,
    pub key: String,
    pub hint: String,
}

/// The longest key name accepted, in characters.
pub const MAX_KEY_NAME_LENGTH: u64 = 64;

/// What a new key is for: its owner and the label it is listed under.
#[derive(Debug, Clone, Copy)]
pub struct ApiKeyRequest<'a> {
    pub owner: ApiKeyOwner,
    pub name: &'a str,
}

pub async fn issue_api_key(
    connection: &mut PgConnection,
    request: ApiKeyRequest<'_>,
) -> Result<IssuedApiKey, sqlx::Error> {
    let name = request.name.trim();
    let kind = request.owner.kind;
    let token = OpaqueToken::generate(kind.token_prefix());
    let issued = IssuedApiKey {
        id: Uuid::new_v4(),
        kind: kind.as_str(),
        name: name.to_owned(),
        hint: key_hint(&token.plaintext),
        key: token.plaintext,
    };
    let stored = StoredApiKey {
        id: issued.id,
        owner: request.owner,
        key_hash: &token.hash,
        key_hint: &issued.hint,
        name,
    };
    insert_api_key(connection, stored).await?;

    Ok(issued)
}

fn key_hint(plaintext: &str) -> String {
    let start = plaintext.len().saturating_sub(KEY_HINT_LENGTH);
    let hint = plaintext.get(start..).unwrap_or_default();

    hint.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hint_is_the_last_characters() {
        assert_eq!(key_hint("nc_pk_0123abcd"), "abcd");
    }

    #[test]
    fn hint_of_a_short_value_is_the_whole_value() {
        assert_eq!(key_hint("ab"), "ab");
    }
}
