use axum::extract::rejection::BytesRejection;
use axum::http::StatusCode;

use crate::shared::http::api_error::ApiError;
use crate::shared::image::image_processing::ImageProcessingError;
use crate::shared::image::square_image::SquareImageError;

/// A body that could not be read: too large for the server, or cut off.
pub fn map_body_rejection(rejection: &BytesRejection) -> ApiError {
    if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
        return ApiError::PayloadTooLarge;
    }

    ApiError::invalid_request(rejection.body_text())
}

/// What the client can fix is a 400 or 413; anything else is the server's fault.
pub fn map_processing_error(error: ImageProcessingError) -> ApiError {
    match error {
        ImageProcessingError::Image(SquareImageError::TooLarge) => ApiError::PayloadTooLarge,
        ImageProcessingError::Image(
            image_error @ (SquareImageError::Empty
            | SquareImageError::UnsupportedFormat
            | SquareImageError::Unreadable),
        ) => ApiError::invalid_request(image_error),
        other => ApiError::internal(other),
    }
}
