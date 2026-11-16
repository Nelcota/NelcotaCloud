use oauth2::url::Url;

const ALLOWED_SCHEMES: [&str; 2] = ["http", "https"];
const TOKEN_QUERY_PARAMETER: &str = "token";

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("site URL must be an absolute http(s) URL")]
pub struct InvalidSiteUrl;

/// Base URL of a tenant's app: email links point here, and OAuth only redirects back to its origin.
#[derive(Debug, Clone)]
pub struct SiteUrl(Url);

impl SiteUrl {
    pub fn parse(raw: &str) -> Result<Self, InvalidSiteUrl> {
        let url = Url::parse(raw.trim()).map_err(|_| InvalidSiteUrl)?;

        if ALLOWED_SCHEMES.contains(&url.scheme()) == false {
            return Err(InvalidSiteUrl);
        }

        if url.host_str().is_none() {
            return Err(InvalidSiteUrl);
        }

        Ok(Self(url))
    }

    pub fn as_str(&self) -> &str {
        self.0.as_str()
    }

    /// Same origin and under the site's path, so the OAuth flow cannot be abused as an open
    /// redirect, not even to another app hosted on the same origin (e.g. `user.github.io/other`).
    pub fn allows_redirect_to(&self, target: &Url) -> bool {
        target.origin() == self.0.origin() && is_under_path(target.path(), self.0.path())
    }

    pub fn link_with_token(&self, path: &str, token: &str) -> String {
        let mut link = self.0.clone();
        let base_path = link.path().trim_end_matches('/').to_owned();
        link.set_path(&format!("{base_path}/{path}"));
        link.set_fragment(None);
        link.query_pairs_mut()
            .clear()
            .append_pair(TOKEN_QUERY_PARAMETER, token);

        link.into()
    }
}

/// `/app/x` is under `/app`, `/application` is not; everything is under `/`.
fn is_under_path(target_path: &str, site_path: &str) -> bool {
    let site_path = site_path.trim_end_matches('/');

    target_path == site_path || target_path.starts_with(&format!("{site_path}/"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_http_urls() {
        for raw in [
            "",
            "not a url",
            "ftp://app.test",
            "javascript:alert(1)",
            "/relative",
        ] {
            assert_eq!(SiteUrl::parse(raw).err(), Some(InvalidSiteUrl));
        }
    }

    #[test]
    fn builds_links_under_the_site_path() -> Result<(), InvalidSiteUrl> {
        let site_url = SiteUrl::parse("https://app.test/base/?old=1#frag")?;
        let link = site_url.link_with_token("auth/verify-email", "abc 123");

        assert_eq!(
            link,
            "https://app.test/base/auth/verify-email?token=abc+123"
        );
        Ok(())
    }

    #[test]
    fn keeps_redirects_under_the_site_path() -> Result<(), Box<dyn std::error::Error>> {
        let site_url = SiteUrl::parse("https://user.github.io/app")?;

        assert!(site_url.allows_redirect_to(&Url::parse("https://user.github.io/app")?));
        assert!(site_url.allows_redirect_to(&Url::parse("https://user.github.io/app/callback")?));
        assert!(
            site_url.allows_redirect_to(&Url::parse("https://user.github.io/application")?)
                == false
        );
        assert!(
            site_url.allows_redirect_to(&Url::parse("https://user.github.io/other/cb")?) == false
        );
        Ok(())
    }

    #[test]
    fn allows_only_same_origin_redirects() -> Result<(), Box<dyn std::error::Error>> {
        let site_url = SiteUrl::parse("https://app.test")?;

        assert!(site_url.allows_redirect_to(&Url::parse("https://app.test/callback")?));
        assert!(site_url.allows_redirect_to(&Url::parse("https://evil.test/")?) == false);
        assert!(site_url.allows_redirect_to(&Url::parse("http://app.test/")?) == false);
        assert!(site_url.allows_redirect_to(&Url::parse("https://app.test.evil.test/")?) == false);
        Ok(())
    }
}
