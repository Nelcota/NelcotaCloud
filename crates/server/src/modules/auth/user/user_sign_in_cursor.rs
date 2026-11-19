use std::fmt;
use std::str::FromStr;

use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::user::user_record::User;

/// Marks a cursor of the last-login order, so it is never read as a creation-order cursor.
const PREFIX: char = 'l';
/// Stands for "never logged in": those users come after everyone who did.
const NEVER: &str = "-";

/// Where the last-login order continues: the last row's login time (or none) and id.
#[derive(Debug, PartialEq, Eq)]
pub struct UserSignInCursor {
    pub last_sign_in_at: Option<OffsetDateTime>,
    pub id: Uuid,
}

#[derive(Debug, thiserror::Error)]
#[error("invalid last login cursor")]
pub struct InvalidUserSignInCursor;

impl FromStr for UserSignInCursor {
    type Err = InvalidUserSignInCursor;

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        let body = raw.strip_prefix(PREFIX).ok_or(InvalidUserSignInCursor)?;
        let (timestamp, id) = body.split_once(':').ok_or(InvalidUserSignInCursor)?;
        let id = Uuid::parse_str(id).map_err(|_| InvalidUserSignInCursor)?;
        let last_sign_in_at = parse_timestamp(timestamp)?;

        Ok(Self {
            last_sign_in_at,
            id,
        })
    }
}

fn parse_timestamp(raw: &str) -> Result<Option<OffsetDateTime>, InvalidUserSignInCursor> {
    if raw == NEVER {
        return Ok(None);
    }

    let nanos: i128 = raw.parse().map_err(|_| InvalidUserSignInCursor)?;
    let moment =
        OffsetDateTime::from_unix_timestamp_nanos(nanos).map_err(|_| InvalidUserSignInCursor)?;

    // Postgres keeps microseconds, so a finer value never came from a row.
    if nanos % 1_000 != 0 || moment.year() < 0 {
        return Err(InvalidUserSignInCursor);
    }

    Ok(Some(moment))
}

impl fmt::Display for UserSignInCursor {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.last_sign_in_at {
            Some(moment) => write!(
                formatter,
                "{PREFIX}{}:{}",
                moment.unix_timestamp_nanos(),
                self.id
            ),
            None => write!(formatter, "{PREFIX}{NEVER}:{}", self.id),
        }
    }
}

impl From<&User> for UserSignInCursor {
    fn from(user: &User) -> Self {
        Self {
            last_sign_in_at: user.last_sign_in_at,
            id: user.id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn round_trips_with_and_without_a_login() -> TestResult {
        let moment = OffsetDateTime::from_unix_timestamp(1_790_000_000)?;
        for cursor in [
            UserSignInCursor {
                last_sign_in_at: Some(moment),
                id: Uuid::from_u128(7),
            },
            UserSignInCursor {
                last_sign_in_at: None,
                id: Uuid::from_u128(8),
            },
        ] {
            let parsed: UserSignInCursor = cursor.to_string().parse()?;
            assert_eq!(parsed, cursor);
        }

        Ok(())
    }

    #[test]
    fn refuses_creation_cursors_and_malformed_values() {
        let id = Uuid::from_u128(1);
        for raw in [
            format!("1790000000000000000:{id}"),
            format!("l:{id}"),
            format!("l1790000000000000001:{id}"),
            "l-:not-a-uuid".to_owned(),
            "l-".to_owned(),
            String::new(),
        ] {
            assert!(raw.parse::<UserSignInCursor>().is_err(), "{raw}");
        }
    }
}
