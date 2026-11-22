use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::modules::storage::catalog::object::StorageObject;
use crate::modules::storage::catalog::object_page::ObjectPage;
use crate::shared::http::api_error::ApiError;

const MAX_PAGE_SIZE: i64 = 100;
const DEFAULT_PAGE_SIZE: i64 = 50;

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PageInput {
    pub limit: Option<i64>,
    pub before: Option<Uuid>,
}

impl PageInput {
    pub fn size(&self) -> Result<i64, ApiError> {
        let size = self.limit.unwrap_or(DEFAULT_PAGE_SIZE);

        if (1..=MAX_PAGE_SIZE).contains(&size) == false {
            return Err(ApiError::invalid_request("limit must be between 1 and 100"));
        }

        Ok(size)
    }

    pub fn finish(items: Vec<StorageObject>, size: i64) -> ObjectPage {
        let size = usize::try_from(size).unwrap_or_default();
        let mut items = items;
        let mut next_cursor = None;

        if items.len() > size {
            items.truncate(size);
            next_cursor = items.last().map(|item| item.id);
        }

        ObjectPage { items, next_cursor }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_the_default_and_rejects_page_sizes_outside_bounds() {
        assert_eq!(
            PageInput {
                limit: None,
                before: None
            }
            .size()
            .ok(),
            Some(50)
        );
        for limit in [0, 101] {
            assert!(
                PageInput {
                    limit: Some(limit),
                    before: None
                }
                .size()
                .is_err()
            );
        }
    }
}
