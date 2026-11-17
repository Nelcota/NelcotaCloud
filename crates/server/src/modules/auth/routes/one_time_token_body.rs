use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
pub struct OneTimeTokenBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
}
