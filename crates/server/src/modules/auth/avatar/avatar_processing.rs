use axum::body::Bytes;
use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinError;

use crate::modules::auth::avatar::avatar_image::{AvatarImageError, normalize_avatar};

#[derive(Debug, thiserror::Error)]
pub enum AvatarProcessingError {
    #[error(transparent)]
    Image(#[from] AvatarImageError),
    #[error("avatar processing task failed: {0}")]
    Task(#[from] JoinError),
    #[error("avatar processing is unavailable: {0}")]
    Unavailable(#[from] AcquireError),
}

/// Images decoded at once: one may take up to 128 MiB while decoding, so concurrent uploads
/// wait their turn instead of adding up to the server's memory.
const DECODES_AT_ONCE: usize = 2;

static DECODE_SLOTS: Semaphore = Semaphore::const_new(DECODES_AT_ONCE);

/// Runs on the blocking pool: decoding and resizing an image is CPU heavy.
pub async fn process_avatar(upload: Bytes) -> Result<Vec<u8>, AvatarProcessingError> {
    let _slot = DECODE_SLOTS.acquire().await?;
    let avatar = tokio::task::spawn_blocking(move || normalize_avatar(&upload)).await??;

    Ok(avatar)
}
