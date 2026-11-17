use std::fmt::Display;

use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of the Data API and of the console's database tools.
#[derive(Debug, thiserror::Error)]
pub enum DatabaseRejection {
    #[error("table {0} does not exist in the public schema")]
    TableNotFound(String),
    #[error("column {0} does not exist")]
    ColumnNotFound(String),
    #[error("no relationship between {0} and {1} was found")]
    RelationshipNotFound(String, String),
    #[error("more than one relationship between {0} and {1}: name one with !<constraint>")]
    AmbiguousRelationship(String, String),
    #[error("function {0} does not exist or does not accept these arguments")]
    FunctionNotFound(String),
    #[error("{0}")]
    InvalidQuery(String),
    #[error("updates and deletes need at least one filter")]
    FilterRequired,
    #[error("permission denied by the table's privileges or row level security policies")]
    PermissionDenied,
    #[error("the value conflicts with unique constraint {0}")]
    UniqueViolation(String),
    #[error("the row references or is referenced by another row (constraint {0})")]
    ForeignKeyViolation(String),
    #[error("a required column was left empty (constraint {0})")]
    NotNullViolation(String),
    #[error("the value breaks check constraint {0}")]
    CheckViolation(String),
    #[error("a value does not match its column's type")]
    InvalidValue,
    #[error("the query took too long and was cancelled")]
    QueryTimeout,
    #[error("{0}")]
    RaisedException(String),
    #[error("the result has {0} rows, but exactly one was requested")]
    NotSingleRow(u64),
    #[error("{0}")]
    SqlError(String),
    #[error("the response would be larger than 16 MiB: select fewer columns or rows")]
    ResponseTooLarge,
    #[error("the database is busy, try again shortly")]
    DatabaseBusy,
    #[error("the transaction conflicted with another one, try again")]
    TransactionConflict,
    #[error("the value conflicts with exclusion constraint {0}")]
    ExclusionViolation(String),
}

impl DatabaseRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::TableNotFound(_) => (StatusCode::NOT_FOUND, "table_not_found"),
            Self::ColumnNotFound(_) => (StatusCode::BAD_REQUEST, "column_not_found"),
            Self::RelationshipNotFound(..) => (StatusCode::BAD_REQUEST, "relationship_not_found"),
            Self::AmbiguousRelationship(..) => (StatusCode::BAD_REQUEST, "ambiguous_relationship"),
            Self::FunctionNotFound(_) => (StatusCode::NOT_FOUND, "function_not_found"),
            Self::InvalidQuery(_) => (StatusCode::BAD_REQUEST, "invalid_query"),
            Self::FilterRequired => (StatusCode::BAD_REQUEST, "filter_required"),
            Self::PermissionDenied => (StatusCode::FORBIDDEN, "permission_denied"),
            Self::UniqueViolation(_) => (StatusCode::CONFLICT, "unique_violation"),
            Self::ForeignKeyViolation(_) => (StatusCode::CONFLICT, "foreign_key_violation"),
            Self::NotNullViolation(_) => (StatusCode::BAD_REQUEST, "not_null_violation"),
            Self::CheckViolation(_) => (StatusCode::BAD_REQUEST, "check_violation"),
            Self::InvalidValue => (StatusCode::BAD_REQUEST, "invalid_value"),
            Self::QueryTimeout => (StatusCode::GATEWAY_TIMEOUT, "query_timeout"),
            Self::RaisedException(_) => (StatusCode::BAD_REQUEST, "raised_exception"),
            Self::NotSingleRow(_) => (StatusCode::NOT_ACCEPTABLE, "not_single_row"),
            Self::SqlError(_) => (StatusCode::BAD_REQUEST, "sql_error"),
            Self::ResponseTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, "response_too_large"),
            Self::DatabaseBusy => (StatusCode::SERVICE_UNAVAILABLE, "database_busy"),
            Self::TransactionConflict => (StatusCode::CONFLICT, "transaction_conflict"),
            Self::ExclusionViolation(_) => (StatusCode::CONFLICT, "exclusion_violation"),
        }
    }

    pub fn invalid_query(message: impl Display) -> Self {
        Self::InvalidQuery(message.to_string())
    }
}

impl From<DatabaseRejection> for ApiError {
    fn from(rejection: DatabaseRejection) -> Self {
        let (status, code) = rejection.status_and_code();

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    /// Clients match on these codes: changing one is a breaking change of the API.
    #[test]
    fn every_refusal_has_a_unique_code() {
        let name = || "x".to_owned();
        let rejections = [
            DatabaseRejection::TableNotFound(name()),
            DatabaseRejection::ColumnNotFound(name()),
            DatabaseRejection::RelationshipNotFound(name(), name()),
            DatabaseRejection::AmbiguousRelationship(name(), name()),
            DatabaseRejection::FunctionNotFound(name()),
            DatabaseRejection::InvalidQuery(name()),
            DatabaseRejection::FilterRequired,
            DatabaseRejection::PermissionDenied,
            DatabaseRejection::UniqueViolation(name()),
            DatabaseRejection::ForeignKeyViolation(name()),
            DatabaseRejection::NotNullViolation(name()),
            DatabaseRejection::CheckViolation(name()),
            DatabaseRejection::InvalidValue,
            DatabaseRejection::QueryTimeout,
            DatabaseRejection::RaisedException(name()),
            DatabaseRejection::NotSingleRow(2),
            DatabaseRejection::SqlError(name()),
            DatabaseRejection::ResponseTooLarge,
            DatabaseRejection::DatabaseBusy,
            DatabaseRejection::TransactionConflict,
            DatabaseRejection::ExclusionViolation(name()),
        ];
        let mut seen_codes = HashSet::new();

        for rejection in rejections {
            let (_, code) = rejection.status_and_code();
            assert!(seen_codes.insert(code), "duplicate code {code}");
        }
    }

    #[test]
    fn permission_and_conflicts_keep_their_status() {
        let denied = DatabaseRejection::PermissionDenied.status_and_code();
        let conflict = DatabaseRejection::UniqueViolation("k".to_owned()).status_and_code();

        assert_eq!(denied, (StatusCode::FORBIDDEN, "permission_denied"));
        assert_eq!(conflict, (StatusCode::CONFLICT, "unique_violation"));
    }
}
