use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
pub struct RefreshTokenBody {
    #[validate(length(min = 1, max = 256))]
    pub refresh_token: String,
}
