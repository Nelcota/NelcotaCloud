use std::sync::{Arc, OnceLock};

use uuid::Uuid;

use crate::modules::database::usage::usage_buffer::DataApiUsageBuffer;

/// Which project a Data API request counts for.
///
/// `DataApiCaller` fills it once the credentials resolve the project; the usage middleware
/// reads it after the response. Requests refused before that (bad keys) count for none.
#[derive(Clone, Default)]
pub struct UsageSlot(Arc<OnceLock<UsageTarget>>);

pub struct UsageTarget {
    pub tenant_id: Uuid,
    pub buffer: Arc<DataApiUsageBuffer>,
}

impl UsageSlot {
    pub fn fill(&self, target: UsageTarget) {
        // A second fill for the same request (an extractor run twice) keeps the first.
        if self.0.set(target).is_err() {
            tracing::debug!("usage slot already filled");
        }
    }

    pub fn target(&self) -> Option<&UsageTarget> {
        self.0.get()
    }
}
