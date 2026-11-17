use std::io::Cursor;

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader, Limits, RgbImage};

/// Width and height of every stored avatar, in pixels.
pub const AVATAR_SIZE: u32 = 256;
pub const MAX_AVATAR_UPLOAD_BYTES: usize = 1024 * 1024;
/// Bounds what a small compressed file may expand to when decoded (decompression bombs).
const MAX_SOURCE_DIMENSION: u32 = 4096;
const MAX_DECODE_ALLOCATION_BYTES: u64 = 128 * 1024 * 1024;
const JPEG_QUALITY: u8 = 85;
const ACCEPTED_FORMATS: [ImageFormat; 3] = [ImageFormat::Png, ImageFormat::Jpeg, ImageFormat::WebP];
const OPAQUE: u32 = 255;

#[derive(Debug, thiserror::Error)]
pub enum AvatarImageError {
    #[error("the image is empty")]
    Empty,
    #[error("the image must be at most 1 MiB")]
    TooLarge,
    #[error("the image must be PNG, JPEG or WebP")]
    UnsupportedFormat,
    #[error("the image could not be read")]
    Unreadable,
    #[error("the avatar could not be encoded: {0}")]
    Encoding(image::ImageError),
}

/// Re-encodes an upload as the stored avatar: a centered square JPEG with no metadata. Never
/// storing the client's bytes drops EXIF (GPS position) and anything hidden next to the pixels.
pub fn normalize_avatar(upload: &[u8]) -> Result<Vec<u8>, AvatarImageError> {
    if upload.is_empty() {
        return Err(AvatarImageError::Empty);
    }

    if upload.len() > MAX_AVATAR_UPLOAD_BYTES {
        return Err(AvatarImageError::TooLarge);
    }

    let source = decode_upload(upload)?;
    let square = source.resize_to_fill(AVATAR_SIZE, AVATAR_SIZE, FilterType::Lanczos3);

    encode_jpeg(&flatten_onto_white(&square)?)
}

fn decode_upload(upload: &[u8]) -> Result<DynamicImage, AvatarImageError> {
    let mut reader = accepted_reader(upload)?;
    reader.limits(decode_limits());
    let mut decoder = reader
        .into_decoder()
        .map_err(|_| AvatarImageError::Unreadable)?;
    // Phone photos are often stored sideways with an EXIF flag saying how to turn them.
    let orientation = decoder
        .orientation()
        .map_err(|_| AvatarImageError::Unreadable)?;
    let mut image =
        DynamicImage::from_decoder(decoder).map_err(|_| AvatarImageError::Unreadable)?;
    image.apply_orientation(orientation);

    Ok(image)
}

/// A reader for an upload in one of the accepted formats, guessed from its bytes.
fn accepted_reader(upload: &[u8]) -> Result<ImageReader<Cursor<&[u8]>>, AvatarImageError> {
    let reader = ImageReader::new(Cursor::new(upload))
        .with_guessed_format()
        .map_err(|_| AvatarImageError::Unreadable)?;
    let Some(format) = reader.format() else {
        return Err(AvatarImageError::UnsupportedFormat);
    };

    if ACCEPTED_FORMATS.contains(&format) == false {
        return Err(AvatarImageError::UnsupportedFormat);
    }

    Ok(reader)
}

fn decode_limits() -> Limits {
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_SOURCE_DIMENSION);
    limits.max_image_height = Some(MAX_SOURCE_DIMENSION);
    limits.max_alloc = Some(MAX_DECODE_ALLOCATION_BYTES);

    limits
}

/// JPEG has no transparency: transparent pixels would turn black, so they are laid on white.
fn flatten_onto_white(image: &DynamicImage) -> Result<RgbImage, AvatarImageError> {
    let rgba = image.to_rgba8();
    let (width, height) = rgba.dimensions();
    let channels = rgba
        .pixels()
        .flat_map(|pixel| {
            let [red, green, blue, alpha] = pixel.0;
            [red, green, blue].map(|channel| blend_with_white(channel, alpha))
        })
        .collect();
    let Some(flattened) = RgbImage::from_raw(width, height, channels) else {
        return Err(AvatarImageError::Unreadable);
    };

    Ok(flattened)
}

fn blend_with_white(channel: u8, alpha: u8) -> u8 {
    let channel = u32::from(channel);
    let alpha = u32::from(alpha);
    let white_share = OPAQUE.saturating_sub(alpha).saturating_mul(OPAQUE);
    let blended = channel.saturating_mul(alpha).saturating_add(white_share) / OPAQUE;

    u8::try_from(blended).unwrap_or(u8::MAX)
}

fn encode_jpeg(image: &RgbImage) -> Result<Vec<u8>, AvatarImageError> {
    let mut jpeg = Vec::new();
    JpegEncoder::new_with_quality(&mut jpeg, JPEG_QUALITY)
        .encode_image(image)
        .map_err(AvatarImageError::Encoding)?;

    Ok(jpeg)
}

#[cfg(test)]
mod tests {
    use std::error::Error;

    use image::{Rgb, Rgba, RgbaImage};

    use super::*;

    type TestResult = Result<(), Box<dyn Error>>;

    fn encoded(width: u32, height: u32, format: ImageFormat) -> Result<Vec<u8>, Box<dyn Error>> {
        let image = RgbaImage::from_pixel(width, height, Rgba([10, 20, 30, 255]));
        let mut bytes = Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(image).write_to(&mut bytes, format)?;

        Ok(bytes.into_inner())
    }

    #[test]
    fn crops_any_upload_to_a_square_jpeg() -> TestResult {
        let avatar = normalize_avatar(&encoded(600, 300, ImageFormat::Png)?)?;

        let decoded = image::load_from_memory(&avatar)?;
        assert_eq!(image::guess_format(&avatar)?, ImageFormat::Jpeg);
        assert_eq!(
            (decoded.width(), decoded.height()),
            (AVATAR_SIZE, AVATAR_SIZE)
        );
        Ok(())
    }

    #[test]
    fn accepts_jpeg_and_webp() -> TestResult {
        for format in [ImageFormat::Jpeg, ImageFormat::WebP] {
            assert!(normalize_avatar(&encoded(64, 64, format)?).is_ok());
        }

        Ok(())
    }

    #[test]
    fn rejects_empty_and_oversized_uploads() {
        let oversized = vec![0; MAX_AVATAR_UPLOAD_BYTES.saturating_add(1)];

        assert!(matches!(
            normalize_avatar(&[]),
            Err(AvatarImageError::Empty)
        ));
        assert!(matches!(
            normalize_avatar(&oversized),
            Err(AvatarImageError::TooLarge)
        ));
    }

    #[test]
    fn rejects_other_formats() {
        for upload in [
            b"GIF89a\x01\x00\x01\x00".as_slice(),
            b"<svg></svg>",
            b"plain text",
        ] {
            assert!(matches!(
                normalize_avatar(upload),
                Err(AvatarImageError::UnsupportedFormat)
            ));
        }
    }

    #[test]
    fn rejects_corrupt_and_huge_images() -> TestResult {
        let mut truncated = encoded(64, 64, ImageFormat::Png)?;
        truncated.truncate(40);
        let huge = encoded(MAX_SOURCE_DIMENSION.saturating_add(1), 1, ImageFormat::Png)?;

        assert!(matches!(
            normalize_avatar(&truncated),
            Err(AvatarImageError::Unreadable)
        ));
        assert!(matches!(
            normalize_avatar(&huge),
            Err(AvatarImageError::Unreadable)
        ));
        Ok(())
    }

    #[test]
    fn transparent_pixels_become_white() {
        assert_eq!(blend_with_white(0, 0), 255);
        assert_eq!(blend_with_white(0, 255), 0);
        assert_eq!(blend_with_white(200, 255), 200);
        assert_eq!(blend_with_white(0, 128), 127);
    }

    #[test]
    fn flattening_keeps_opaque_colors() -> TestResult {
        let image = DynamicImage::ImageRgba8(RgbaImage::from_pixel(2, 2, Rgba([1, 2, 3, 255])));

        let flattened = flatten_onto_white(&image)?;
        assert!(flattened.pixels().all(|pixel| *pixel == Rgb([1, 2, 3])));
        Ok(())
    }
}
