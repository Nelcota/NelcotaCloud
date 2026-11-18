use sqlx::postgres::PgDatabaseError;

use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::shared::http::api_error::ApiError;

const INSUFFICIENT_PRIVILEGE: &str = "42501";
const UNIQUE_VIOLATION: &str = "23505";
const FOREIGN_KEY_VIOLATION: &str = "23503";
const NOT_NULL_VIOLATION: &str = "23502";
const CHECK_VIOLATION: &str = "23514";
const QUERY_CANCELED: &str = "57014";
const RAISE_EXCEPTION: &str = "P0001";
const UNDEFINED_FUNCTION: &str = "42883";
const DATATYPE_MISMATCH: &str = "42804";
const CANNOT_COERCE: &str = "42846";
const INVALID_COLUMN_REFERENCE: &str = "42P10";
const CARDINALITY_VIOLATION: &str = "21000";
const EXCLUSION_VIOLATION: &str = "23P01";
const SERIALIZATION_FAILURE: &str = "40001";
const DEADLOCK_DETECTED: &str = "40P01";
/// Class 22: data exceptions (invalid text for a type, out of range, bad JSON...).
const DATA_EXCEPTION_CLASS: &str = "22";

/// Turns a Postgres error from a project's query into a refusal the client can act on.
///
/// Only the constraint name and messages the project raised itself are passed on; anything else is
/// logged and answered as a generic 500.
pub fn database_error_response(error: sqlx::Error) -> ApiError {
    let Some(database_error) = error.as_database_error() else {
        return ApiError::internal(error);
    };
    let Some(postgres_error) = database_error.try_downcast_ref::<PgDatabaseError>() else {
        return ApiError::internal(error);
    };
    let Some(rejection) = rejection_for(postgres_error) else {
        return ApiError::internal(error);
    };

    ApiError::from(rejection)
}

fn rejection_for(error: &PgDatabaseError) -> Option<DatabaseRejection> {
    let code = error.code();
    let constraint = || error.constraint().unwrap_or_default().to_owned();

    let rejection = match code {
        INSUFFICIENT_PRIVILEGE => DatabaseRejection::PermissionDenied,
        UNIQUE_VIOLATION => DatabaseRejection::UniqueViolation(constraint()),
        FOREIGN_KEY_VIOLATION => DatabaseRejection::ForeignKeyViolation(constraint()),
        NOT_NULL_VIOLATION => {
            DatabaseRejection::NotNullViolation(error.column().unwrap_or_default().to_owned())
        }
        CHECK_VIOLATION => DatabaseRejection::CheckViolation(constraint()),
        QUERY_CANCELED => DatabaseRejection::QueryTimeout,
        RAISE_EXCEPTION => DatabaseRejection::RaisedException(error.message().to_owned()),
        UNDEFINED_FUNCTION => {
            DatabaseRejection::invalid_query("this operator does not apply to the column's type")
        }
        DATATYPE_MISMATCH | CANNOT_COERCE => DatabaseRejection::InvalidValue,
        INVALID_COLUMN_REFERENCE => DatabaseRejection::invalid_query(
            "on_conflict must name columns of a unique constraint or primary key",
        ),
        CARDINALITY_VIOLATION => DatabaseRejection::invalid_query(
            "the same row appears twice in one upsert, or a subquery returned several rows",
        ),
        EXCLUSION_VIOLATION => DatabaseRejection::ExclusionViolation(constraint()),
        SERIALIZATION_FAILURE | DEADLOCK_DETECTED => DatabaseRejection::TransactionConflict,
        data_code if data_code.starts_with(DATA_EXCEPTION_CLASS) => DatabaseRejection::InvalidValue,
        _ => return None,
    };

    Some(rejection)
}
