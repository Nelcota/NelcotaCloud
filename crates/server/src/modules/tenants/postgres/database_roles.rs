use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;

/// Requests with the publishable key and no user token.
pub const ANON_ROLE: &str = "nelcota_anon";
/// Requests with the publishable key and a user's access token.
pub const AUTHENTICATED_ROLE: &str = "nelcota_authenticated";
/// Requests with the secret key: bypasses row level security.
pub const SERVICE_ROLE: &str = "nelcota_service";
/// Owner of each project's `public` schema; the console's editors run as it.
///
/// Never a superuser, so a project's SQL cannot reach the server or other databases.
pub const DEVELOPER_ROLE: &str = "nelcota_developer";

const TENANT_AUTHENTICATOR_PREFIX: &str = "nelcota_t_";
const TENANT_DIRECT_PREFIX: &str = "nelcota_c_";

/// The login role of one project's Data API pool.
///
/// It can do nothing by itself (NOINHERIT): each request switches it to one of the roles
/// above. It is the project's own, so SQL that falls back to it (`RESET ROLE`, `COMMIT`) can
/// only see, signal or alter connections of the same project. Slugs are `[a-z0-9_]` of at most
/// 40 characters, so the name is a plain identifier under Postgres's 63.
pub fn tenant_authenticator_role(slug: &TenantSlug) -> String {
    format!("{TENANT_AUTHENTICATOR_PREFIX}{}", slug.as_str())
}

/// The login role of one project's direct connections (ORMs, `psql`, through the pooler).
///
/// It logs in as itself and becomes the project's developer (`SET role` as a role default),
/// so it can do what the console's SQL editor does, in its own database only: it is the one
/// other role allowed to connect there. Its password is shown once and never stored.
pub fn tenant_direct_role(slug: &TenantSlug) -> String {
    format!("{TENANT_DIRECT_PREFIX}{}", slug.as_str())
}
