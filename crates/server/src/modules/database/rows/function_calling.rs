use std::sync::Arc;

use serde_json::{Map, Value};

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::execution::data_api_session::{DataApiSession, TransactionAccess};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::function_resolution::resolve_function;
use crate::modules::database::sql::function_call_statement::function_call_statement;
use crate::shared::http::api_error::ApiError;

/// Calls a function of the project's `public` schema with named arguments, as the caller's
/// role; answers its result as JSON (an array for set-returning functions).
pub async fn call_function(
    state: &AppState,
    caller: &DataApiCaller,
    function_name: &str,
    body: Value,
) -> Result<String, ApiError> {
    let arguments = match body {
        Value::Object(arguments) => arguments,
        Value::Null => Map::new(),
        _ => {
            return Err(ApiError::from(DatabaseRejection::invalid_query(
                "send the arguments as an object",
            )));
        }
    };
    let mut session = DataApiSession::open(state, caller, TransactionAccess::ReadWrite).await?;
    let schema = Arc::clone(&session.schema);
    let function = resolve_function(&schema, function_name, &arguments)?;
    let mut statement = function_call_statement(function, &arguments);
    let result: Option<Option<String>> = session
        .guard
        .run(
            statement
                .build_query_scalar()
                .fetch_optional(&mut *session.transaction),
        )
        .await?;
    // A function returning no row (`SETOF` aside, which answers `[]`) answers null.
    let Some(row) = result else {
        session.commit().await?;
        return Ok("null".to_owned());
    };
    let Some(value) = row else {
        return Err(ApiError::from(DatabaseRejection::ResponseTooLarge));
    };
    session.commit().await?;

    Ok(value)
}
