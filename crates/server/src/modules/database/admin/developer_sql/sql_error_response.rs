use sqlx::postgres::PgDatabaseError;

use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::shared::http::api_error::ApiError;

const QUERY_CANCELED: &str = "57014";

/// The console runs SQL a project member wrote on the project's own database, so Postgres's
/// message is the useful answer; connection and protocol failures stay internal.
pub fn sql_error_response(error: sqlx::Error) -> ApiError {
    let database_error = match error.as_database_error() {
        Some(database_error) => database_error,
        None => return ApiError::internal(error),
    };
    let postgres_error = match database_error.try_downcast_ref::<PgDatabaseError>() {
        Some(postgres_error) => postgres_error,
        None => return ApiError::internal(error),
    };

    if postgres_error.code() == QUERY_CANCELED {
        return ApiError::from(DatabaseRejection::QueryTimeout);
    }

    let message = match postgres_error.detail() {
        Some(detail) => format!("{} ({detail})", postgres_error.message()),
        None => postgres_error.message().to_owned(),
    };

    ApiError::from(DatabaseRejection::SqlError(message))
}
