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
    #[serde(with = "time::serde::rfc3339")]
    pub confirm_until: OffsetDateTime,
    pub headers: BTreeMap<String, String>,
}

#[derive(Serialize, ToSchema)]
pub struct SignedDownload {
    pub url: String,
}
