use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::response::Response;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::routes::rows_response::{json_text_response, parse_json_body};
use crate::modules::database::rows::function_calling::call_function as call_project_function;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /rest/v1/rpc/{function}`: calls a function of the project's `public` schema with
/// the body's keys as named arguments, as the caller's role.
#[utoipa::path(
    post,
    path = "/rest/v1/rpc/{function}",
    tag = "database",
    security(("api_key" = []), ("api_key" = [], "bearer" = []), ("platform_account" = [], "project" = [])),
    params(("function" = String, Path, description = "Function of the public schema")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "The function's result", body = serde_json::Value),
        (status = 400, description = "Invalid arguments, or the function raised an error", body = ErrorBody),
        (status = 403, description = "Refused by privileges", body = ErrorBody),
        (status = 404, description = "No function with that name takes these arguments", body = ErrorBody),
    )
)]
pub async fn call_function(
    State(state): State<AppState>,
    caller: DataApiCaller,
    Path(function): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let arguments = parse_json_body(&body)?;
    let result = call_project_function(&state, &caller, &function, arguments).await?;

    Ok(json_text_response(result))
}
