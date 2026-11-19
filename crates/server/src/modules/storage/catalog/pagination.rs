use serde::Deserialize;
use time::OffsetDateTime;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::modules::storage::catalog::object::{ObjectPage, StorageObject};
use crate::shared::http::api_error::ApiError;

const MAX_PAGE_SIZE: i64 = 100;
const DEFAULT_PAGE_SIZE: i64 = 50;

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PageInput {
    pub limit: Option<i64>,
    pub before: Option<String>,
}

pub enum PageCursor {
    Legacy(Uuid),
    CreatedAt(OffsetDateTime, Uuid),
}

impl PageInput {
    pub fn size(&self) -> Result<i64, ApiError> {
        let size = self.limit.unwrap_or(DEFAULT_PAGE_SIZE);

        if (1..=MAX_PAGE_SIZE).contains(&size) == false {
            return Err(ApiError::invalid_request("limit must be between 1 and 100"));
        }

        Ok(size)
    }

    pub fn cursor(&self) -> Result<Option<PageCursor>, ApiError> {
        self.before.as_deref().map(parse_cursor).transpose()
    }

    pub fn finish(mut items: Vec<StorageObject>, size: i64) -> ObjectPage {
        let size = usize::try_from(size).unwrap_or_default();

        if items.len() <= size {
            return ObjectPage {
                items,
                next_cursor: None,
            };
        }

        items.truncate(size);
        let next_cursor = items
            .last()
            .map(|item| format!("{}:{}", item.created_at.unix_timestamp_nanos(), item.id));

        ObjectPage { items, next_cursor }
    }
}

fn parse_cursor(cursor: &str) -> Result<PageCursor, ApiError> {
    let invalid = || ApiError::invalid_request("invalid storage page cursor");
    let (timestamp, id) = match cursor.split_once(':') {
        Some(parts) => parts,
        None => {
            return Uuid::parse_str(cursor)
                .map(PageCursor::Legacy)
                .map_err(|_| invalid());
        }
    };
    let id = Uuid::parse_str(id).map_err(|_| invalid())?;
    let nanos = timestamp.parse::<i128>().map_err(|_| invalid())?;
    let created_at = OffsetDateTime::from_unix_timestamp_nanos(nanos).map_err(|_| invalid())?;

    Ok(PageCursor::CreatedAt(created_at, id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_legacy_cursors_and_checks_timestamped_cursors() {
        let id = Uuid::new_v4();
        assert!(
            matches!(parse_cursor(&id.to_string()), Ok(PageCursor::Legacy(legacy)) if legacy == id)
        );
        assert!(
            matches!(parse_cursor(&format!("0:{id}")), Ok(PageCursor::CreatedAt(timestamp, current)) if current == id && timestamp == OffsetDateTime::UNIX_EPOCH)
        );
        assert!(parse_cursor("bad:invalid").is_err());
    }

    #[test]
    fn uses_the_default_and_rejects_out_of_range_sizes() {
        assert_eq!(
            PageInput {
                limit: None,
                before: None
            }
            .size()
            .ok(),
            Some(50)
        );
        assert!(
            PageInput {
                limit: Some(101),
                before: None
            }
            .size()
            .is_err()
        );
    }
}
