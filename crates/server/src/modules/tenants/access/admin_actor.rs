use uuid::Uuid;

/// Who is acting as a tenant's admin: a server with the secret API key, or a console account.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminActor {
    SecretKey,
    ConsoleAccount(Uuid),
}
