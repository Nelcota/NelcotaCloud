use axum::Json;
use axum::body::Bytes;
use axum::extract::rejection::BytesRejection;
use axum::http::StatusCode;

use crate::modules::auth::avatar::avatar_image::AvatarImageError;
use crate::modules::auth::avatar::avatar_processing::{AvatarProcessingError, process_avatar};
use crate::modules::auth::avatar::avatar_repository::store_avatar;
use crate::modules::auth::avatar::image_file::ImageFile;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `PUT /user/avatar`: the body is the image itself (PNG, JPEG or WebP, up to 1 MiB). The
/// server crops it to a centered square, resizes it and stores it as JPEG.
#[utoipa::path(
    put,
    path = "/auth/v1/user/avatar",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    request_body(
        content = ImageFile,
        content_type = "application/octet-stream",
        description = "The image file: PNG, JPEG or WebP, up to 1 MiB"
    ),
    responses(
        (status = 200, description = "The user with the new photo", body = User),
        (status = 400, description = "Empty, unreadable or unsupported image", body = ErrorBody),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
        (status = 403, description = "The user is banned", body = ErrorBody),
        (status = 413, description = "The image is larger than 1 MiB", body = ErrorBody),
    )
)]
pub async fn upload_avatar(
    authenticated: AuthenticatedUser,
    upload: Result<Bytes, BytesRejection>,
) -> Result<Json<User>, ApiError> {
    let tenant = &authenticated.tenant;
    let user_id = authenticated.claims.sub;
    let user = find_user_by_id(&tenant.pool, user_id).await?;
    let Some(mut user) = user else {
        return Err(ApiError::from(TenantsRejection::InvalidAccessToken));
    };

    if user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    let upload = upload.map_err(|rejection| map_body_rejection(&rejection))?;
    let avatar = process_avatar(upload).await.map_err(map_processing_error)?;
    let updated_at = store_avatar(&tenant.pool, user_id, &avatar).await?;
    let Some(updated_at) = updated_at else {
        return Err(ApiError::from(TenantsRejection::InvalidAccessToken));
    };
    user.avatar_updated_at = Some(updated_at);

    Ok(Json(user))
}

fn map_body_rejection(rejection: &BytesRejection) -> ApiError {
    if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
        return ApiError::PayloadTooLarge;
    }

    ApiError::invalid_request(rejection.body_text())
}

fn map_processing_error(error: AvatarProcessingError) -> ApiError {
    match error {
        AvatarProcessingError::Image(AvatarImageError::TooLarge) => ApiError::PayloadTooLarge,
        AvatarProcessingError::Image(
            image_error @ (AvatarImageError::Empty
            | AvatarImageError::UnsupportedFormat
            | AvatarImageError::Unreadable),
        ) => ApiError::invalid_request(image_error),
        other => ApiError::internal(other),
    }
}
