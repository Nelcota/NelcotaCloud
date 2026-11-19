use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// How a login proved who the user is. `totp` is the code step that ends a login with MFA on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum LoginMethod {
    Password,
    MagicLink,
    Oauth,
    Totp,
}
