use std::sync::Arc;

use sqlx::PgPool;

use crate::modules::tenants::smtp::tenant_email_senders::TenantEmailSenders;

/// What sending an auth email needs: tenant settings (name, site URL) and the tenant's sender.
/// Cheap to clone, so background jobs own one instead of the whole application state.
#[derive(Clone)]
pub struct AuthMailer {
    pub control_plane_pool: PgPool,
    pub email_senders: Arc<TenantEmailSenders>,
}
