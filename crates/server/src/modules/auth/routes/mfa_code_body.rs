use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
pub struct MfaCodeBody {
    /// The 6-digit code shown by the authenticator app.
    #[validate(length(min = 6, max = 10))]
    pub code: String,
}
