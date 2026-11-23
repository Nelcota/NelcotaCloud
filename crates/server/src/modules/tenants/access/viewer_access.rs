use axum::http::Method;
use axum::http::request::Parts;

use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;

/// Asking for a file's download link is the one POST that only reads: it changes nothing.
const DOWNLOAD_LINK_SUFFIX: &str = "/download-url";

/// Viewers read everything a member reads and change nothing: every request that may write
/// (any method but GET and HEAD) is refused before it reaches the handler.
pub fn ensure_role_allows(role: ProjectRole, parts: &Parts) -> Result<(), TenantsRejection> {
    if role != ProjectRole::Viewer {
        return Ok(());
    }

    if is_reading(&parts.method, parts.uri.path()) {
        return Ok(());
    }

    Err(TenantsRejection::ReadOnlyMember)
}

fn is_reading(method: &Method, path: &str) -> bool {
    match *method {
        Method::GET | Method::HEAD => true,
        Method::POST => path.ends_with(DOWNLOAD_LINK_SUFFIX),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_pass_and_writes_do_not() {
        assert!(is_reading(&Method::GET, "/auth/v1/admin/users"));
        assert!(is_reading(&Method::HEAD, "/rest/v1/todos"));
        assert!(is_reading(&Method::POST, "/database/v1/sql") == false);
        assert!(is_reading(&Method::PATCH, "/auth/v1/admin/settings") == false);
        assert!(is_reading(&Method::DELETE, "/rest/v1/todos") == false);
    }

    #[test]
    fn download_links_are_reads() {
        let path = "/storage/v1/objects/7f2c/download-url";

        assert!(is_reading(&Method::POST, path));
        assert!(is_reading(&Method::DELETE, path) == false);
    }
}
