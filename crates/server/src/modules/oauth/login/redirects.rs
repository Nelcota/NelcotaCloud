use sqlx::PgPool;
use url::Url;
use uuid::Uuid;

use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::http::api_error::ApiError;

pub const RESPONSE_PARAMETERS: [&str; 3] = ["code", "error", "state"];
const SDK_STATE: &str = "nelcota_state";

#[derive(sqlx::FromRow)]
struct RedirectSettings {
    site_url: String,
    oauth_redirect_urls: Vec<String>,
}

async fn settings(pool: &PgPool, tenant_id: Uuid) -> Result<RedirectSettings, ApiError> {
    sqlx::query_as("SELECT site_url, oauth_redirect_urls FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?
        .ok_or(ApiError::NotFound("project"))
}

pub async fn registered_redirects(pool: &PgPool, tenant_id: Uuid) -> Result<Vec<String>, ApiError> {
    let settings = settings(pool, tenant_id).await?;

    effective_redirects(settings)
}

fn effective_redirects(settings: RedirectSettings) -> Result<Vec<String>, ApiError> {
    if settings.oauth_redirect_urls.is_empty() {
        let site = Url::parse(&settings.site_url).map_err(ApiError::internal)?;
        return Ok(vec![registration_url(site).into()]);
    }

    Ok(settings.oauth_redirect_urls)
}

pub async fn require_registered_redirect(
    pool: &PgPool,
    tenant_id: Uuid,
    target: &Url,
) -> Result<(), ApiError> {
    let settings = settings(pool, tenant_id).await?;
    let site = SiteUrl::parse(&settings.site_url).map_err(ApiError::internal)?;
    let redirect = registration_url(target.clone());
    let registered = effective_redirects(settings)?;

    if site.allows_redirect_to(&redirect) == false
        || registered.iter().any(|url| url == redirect.as_str()) == false
    {
        return Err(ApiError::InvalidRequest(
            "redirect_to must match a registered OAuth callback under the current site URL"
                .to_owned(),
        ));
    }

    Ok(())
}

pub async fn save_redirects(
    pool: &PgPool,
    tenant_id: Uuid,
    urls: &[String],
) -> Result<Vec<String>, ApiError> {
    let mut transaction = pool.begin().await?;
    let raw_site: String =
        sqlx::query_scalar("SELECT site_url FROM tenants WHERE id = $1 FOR UPDATE")
            .bind(tenant_id)
            .fetch_optional(&mut *transaction)
            .await?
            .ok_or(ApiError::NotFound("project"))?;
    let site = SiteUrl::parse(&raw_site).map_err(ApiError::internal)?;
    let mut registered = Vec::with_capacity(urls.len());

    for raw in urls {
        let url = Url::parse(raw.trim()).map_err(ApiError::invalid_request)?;

        if site.allows_redirect_to(&url) == false
            || url
                .query_pairs()
                .any(|(name, _)| is_protocol_parameter(&name))
        {
            return Err(ApiError::InvalidRequest(
                "OAuth callbacks must be under the site URL and omit OAuth response parameters"
                    .to_owned(),
            ));
        }

        let canonical: String = registration_url(url).into();

        if registered.contains(&canonical) == false {
            registered.push(canonical);
        }
    }

    sqlx::query("UPDATE tenants SET oauth_redirect_urls = $2 WHERE id = $1")
        .bind(tenant_id)
        .bind(&registered)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    effective_redirects(RedirectSettings {
        site_url: raw_site,
        oauth_redirect_urls: registered,
    })
}

/// The SDK embeds its own per-attempt state in the redirect. Match the exact canonical
/// callback and app parameters separately from the OAuth protocol parameters.
fn registration_url(mut url: Url) -> Url {
    let pairs: Vec<_> = url
        .query_pairs()
        .filter(|(name, _)| is_protocol_parameter(name) == false)
        .map(|(name, value)| (name.into_owned(), value.into_owned()))
        .collect();
    url.set_query(None);

    if pairs.is_empty() == false {
        url.query_pairs_mut().extend_pairs(pairs);
    }

    url
}

fn is_protocol_parameter(name: &str) -> bool {
    name == SDK_STATE || RESPONSE_PARAMETERS.contains(&name)
}
