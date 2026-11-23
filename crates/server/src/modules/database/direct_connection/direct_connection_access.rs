use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::database::direct_connection::connection_string::{
    ConnectionTarget, connection_string,
};
use crate::modules::database::direct_connection::direct_connection_view::{
    DirectConnectionView, NewConnectionPassword,
};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::tenants::postgres::database_roles::tenant_direct_role;
use crate::modules::tenants::provisioning::tenant_repository::find_tenant_slug;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::shared::crypto::hex_encoding::encode_hex;
use crate::shared::crypto::random_bytes::random_bytes;
use crate::shared::http::api_error::ApiError;

/// 24 random bytes: 48 hex characters, safe in a SQL literal and in a URL as they are.
const PASSWORD_BYTES: usize = 24;
const DEFAULT_SSL_MODE: &str = "require";

/// The connection details of a project, whether or not the server offers them.
pub async fn describe_connection(
    state: &AppState,
    tenant_id: Uuid,
) -> Result<DirectConnectionView, ApiError> {
    let slug = tenant_slug(state, tenant_id).await?;
    let server = state.tenant_pools.database_server();
    let has_password = server
        .has_direct_role(&slug)
        .await
        .map_err(ApiError::internal)?;
    let settings = state.settings.direct_connection.as_ref();

    Ok(DirectConnectionView {
        enabled: settings.is_some(),
        host: settings.map(|settings| settings.host.clone()),
        port: settings.map(|settings| settings.port),
        database: slug.database_name(),
        user: tenant_direct_role(&slug),
        ssl_mode: settings.map_or(DEFAULT_SSL_MODE.to_owned(), |settings| {
            settings.ssl_mode.clone()
        }),
        has_password,
    })
}

/// Gives the project's direct connection role a new random password and returns it once.
pub async fn reset_connection_password(
    state: &AppState,
    tenant_id: Uuid,
) -> Result<NewConnectionPassword, ApiError> {
    let Some(settings) = state.settings.direct_connection.as_ref() else {
        return Err(DatabaseRejection::DirectConnectionDisabled.into());
    };
    let slug = tenant_slug(state, tenant_id).await?;
    let password = encode_hex(&random_bytes::<PASSWORD_BYTES>());
    state
        .tenant_pools
        .database_server()
        .reset_direct_role(&slug, &password)
        .await
        .map_err(ApiError::internal)?;
    let user = tenant_direct_role(&slug);
    let database = slug.database_name();
    let target = ConnectionTarget {
        user: &user,
        database: &database,
    };

    Ok(NewConnectionPassword {
        connection_string: connection_string(settings, &target, &password),
        password,
    })
}

async fn tenant_slug(state: &AppState, tenant_id: Uuid) -> Result<TenantSlug, ApiError> {
    let raw_slug = find_tenant_slug(&state.control_plane_pool, tenant_id).await?;
    let Some(raw_slug) = raw_slug else {
        return Err(ApiError::internal("the project has no slug"));
    };

    TenantSlug::parse(&raw_slug).map_err(ApiError::internal)
}
