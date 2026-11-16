use time::OffsetDateTime;
use uuid::Uuid;

/// One login and every refresh token rotated from it. Revoking the family ends the session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SessionFamily {
    pub id: Uuid,
    /// When the login happened. `None` for a new login: the database stamps it with its own
    /// clock, the same clock that stamps session invalidations it is compared with.
    pub started_at: Option<OffsetDateTime>,
}

impl SessionFamily {
    pub fn new_login() -> Self {
        Self {
            id: Uuid::new_v4(),
            started_at: None,
        }
    }
}
