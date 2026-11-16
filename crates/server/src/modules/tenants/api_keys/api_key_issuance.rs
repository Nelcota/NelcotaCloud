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
    pub key: String,
    pub hint: String,
}

pub async fn issue_api_key(
    connection: &mut PgConnection,
    owner: ApiKeyOwner,
) -> Result<IssuedApiKey, sqlx::Error> {
    let kind = owner.kind;
    let token = OpaqueToken::generate(kind.token_prefix());
    let hint = key_hint(&token.plaintext);
    let stored = StoredApiKey {
        id: Uuid::new_v4(),
        owner,
        key_hash: &token.hash,
        key_hint: &hint,
    };
    let id = stored.id;
    insert_api_key(connection, stored).await?;

    Ok(IssuedApiKey {
        id,
        kind: kind.as_str(),
        key: token.plaintext,
        hint,
    })
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
