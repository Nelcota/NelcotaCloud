use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// An external account linked to a user, without the provider's user id.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct LinkedIdentity {
    /// `google` or `github`.
    pub provider: String,
    #[serde(with = "time::serde::rfc3339")]
    pub linked_at: OffsetDateTime,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UserIdentities {
    pub identities: Vec<LinkedIdentity>,
}

/// `None` if there is no such user.
pub async fn list_user_identities(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<UserIdentities>, sqlx::Error> {
    let user_exists: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)")
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    if user_exists == false {
        return Ok(None);
    }

    let identities = sqlx::query_as(
        "SELECT provider, created_at AS linked_at FROM identities WHERE user_id = $1 ORDER BY created_at",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(Some(UserIdentities { identities }))
}
