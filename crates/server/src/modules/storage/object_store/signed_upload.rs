use std::collections::BTreeMap;

use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema)]
pub struct SignedUpload {
    pub object_id: Uuid,
    pub url: String,
    #[serde(with = "time::serde::rfc3339")]
    pub expires_at: OffsetDateTime,
    pub headers: BTreeMap<String, String>,
    /// Whether the original PUT can still be used.
    pub can_upload: bool,
    /// Short-lived GET used to compare bytes when resuming an existing upload.
    pub verification_url: Option<String>,
}
