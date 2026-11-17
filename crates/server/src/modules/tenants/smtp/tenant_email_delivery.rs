use std::sync::Arc;

use tracing::{Instrument, Span};
use uuid::Uuid;

use crate::modules::tenants::smtp::tenant_email_senders::TenantEmailSenders;
use crate::shared::email::email_sender::deliver_and_log;
use crate::shared::email::outgoing_email::OutgoingEmail;

/// Sends through the tenant's sender without the request waiting for it.
///
/// The sender is built in the background too: building it resolves DNS and probes the server, and a request whose
/// time or status depended on that would reveal whether the email exists (only existing
/// accounts get emails). Runs in the caller's span, so failures keep the request's context.
pub fn send_tenant_email_in_background(
    senders: Arc<TenantEmailSenders>,
    tenant_id: Uuid,
    email: OutgoingEmail,
) {
    let delivery = async move {
        match senders.sender_for(tenant_id).await {
            Ok(sender) => deliver_and_log(&sender, email).await,
            Err(error) => tracing::error!(%error, "could not prepare the tenant's email sender"),
        }
    };
    tokio::spawn(delivery.instrument(Span::current()));
}
