use axum::body::Bytes;
use tokio::sync::{AcquireError, Semaphore};
use tokio::task::JoinError;

use crate::shared::image::square_image::{SquareImageError, normalize_square_image};

#[derive(Debug, thiserror::Error)]
pub enum ImageProcessingError {
    #[error(transparent)]
    Image(#[from] SquareImageError),
    #[error("image processing task failed: {0}")]
    Task(#[from] JoinError),
    #[error("image processing is unavailable: {0}")]
    Unavailable(#[from] AcquireError),
}

/// Images decoded at once: one may take up to 128 MiB while decoding, so concurrent uploads
/// wait their turn instead of adding up to the server's memory.
const DECODES_AT_ONCE: usize = 2;

static DECODE_SLOTS: Semaphore = Semaphore::const_new(DECODES_AT_ONCE);

/// Runs on the blocking pool: decoding and resizing an image is CPU heavy.
pub async fn process_square_image(upload: Bytes) -> Result<Vec<u8>, ImageProcessingError> {
    let slot = DECODE_SLOTS.acquire().await?;
    let image = tokio::task::spawn_blocking(move || {
        // Cancelling the request does not interrupt the decoder.
        let _slot = slot;
        normalize_square_image(&upload)
    })
    .await??;

    Ok(image)
}
