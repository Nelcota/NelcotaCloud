use crate::modules::auth::user::user_record::User;

/// What an admin change did: a user already in the asked state is returned unchanged, with no
/// webhook and no activity entry.
pub enum StatusChange {
    Changed(User),
    Unchanged(User),
}

impl StatusChange {
    pub fn into_user(self) -> User {
        match self {
            Self::Changed(user) | Self::Unchanged(user) => user,
        }
    }
}
