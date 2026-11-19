use std::fmt;
use std::str::FromStr;

use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::user::user_record::User;

#[derive(Debug, PartialEq, Eq)]
pub struct UserCursor {
    pub created_at: OffsetDateTime,
    pub id: Uuid,
}

#[derive(Debug, thiserror::Error)]
#[error("invalid user cursor")]
pub struct InvalidUserCursor;

impl FromStr for UserCursor {
    type Err = InvalidUserCursor;

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        let (timestamp, id) = raw.split_once(':').ok_or(InvalidUserCursor)?;
        let nanos: i128 = timestamp.parse().map_err(|_| InvalidUserCursor)?;
        let created_at =
            OffsetDateTime::from_unix_timestamp_nanos(nanos).map_err(|_| InvalidUserCursor)?;
        let id = Uuid::parse_str(id).map_err(|_| InvalidUserCursor)?;

        if nanos % 1_000 != 0 || created_at.year() < 0 {
            return Err(InvalidUserCursor);
        }

        Ok(Self { created_at, id })
    }
}

impl fmt::Display for UserCursor {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{}:{}",
            self.created_at.unix_timestamp_nanos(),
            self.id
        )
    }
}

impl From<&User> for UserCursor {
    fn from(user: &User) -> Self {
        Self {
            created_at: user.created_at,
            id: user.id,
        }
    }
}
