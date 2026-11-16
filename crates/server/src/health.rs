#[utoipa::path(
    get,
    path = "/health",
    tag = "system",
    responses(
        (status = 200, description = "The API is up", body = String, content_type = "text/plain"),
    )
)]
pub async fn health() -> &'static str {
    "ok"
}
