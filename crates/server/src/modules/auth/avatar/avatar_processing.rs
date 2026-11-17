use axum::body::Bytes;
use tokio::task::JoinError;

use crate::modules::auth::avatar::avatar_image::{AvatarImageError, normalize_avatar};

#[derive(Debug, thiserror::Error)]
pub enum AvatarProcessingError {
    #[error(transparent)]
    Image(#[from] AvatarImageError),
    #[error("avatar processing task failed: {0}")]
    Task(#[from] JoinError),
}

/// Runs on the blocking pool: decoding and resizing an image is CPU heavy.
pub async fn process_avatar(upload: Bytes) -> Result<Vec<u8>, AvatarProcessingError> {
    let avatar = tokio::task::spawn_blocking(move || normalize_avatar(&upload)).await??;

    Ok(avatar)
}
