use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

/// What can change on an existing table from the console.
#[derive(Debug, Deserialize, ToSchema, Validate)]
pub struct ChangeTableRequest {
    pub rls_enabled: bool,
}
