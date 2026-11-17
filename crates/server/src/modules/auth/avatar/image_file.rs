use utoipa::ToSchema;

/// Raw image bytes in a request or response body, described as a binary file so generated
/// clients send and receive a file instead of a list of numbers.
#[derive(ToSchema)]
#[schema(value_type = String, format = Binary)]
pub struct ImageFile(pub Vec<u8>);
