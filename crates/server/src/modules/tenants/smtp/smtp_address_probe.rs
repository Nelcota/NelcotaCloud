use std::net::IpAddr;
use std::time::Duration;

use tokio::net::TcpStream;
use tokio::time::timeout;

/// Bounds how long one dead address delays the next, so a sender is built in a few seconds.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("SMTP server did not accept connections on any of its addresses")]
pub struct SmtpUnreachable;

/// The first of the already checked addresses that accepts a TCP connection.
///
/// Tried in resolver order. Pinning blindly to the first one fails when it cannot be reached, e.g. an IPv6 address on a
/// server without IPv6 routing, or `localhost` as `::1` when the SMTP server listens on IPv4.
pub async fn first_reachable_address(
    addresses: &[IpAddr],
    port: u16,
) -> Result<IpAddr, SmtpUnreachable> {
    for address in addresses {
        if accepts_connections(*address, port).await {
            return Ok(*address);
        }
    }

    Err(SmtpUnreachable)
}

/// Only opens and closes the connection; the SMTP dialog happens later on the pinned address.
async fn accepts_connections(address: IpAddr, port: u16) -> bool {
    let connection = timeout(CONNECT_TIMEOUT, TcpStream::connect((address, port))).await;

    matches!(connection, Ok(Ok(_)))
}

#[cfg(test)]
mod tests {
    use std::net::{Ipv4Addr, Ipv6Addr};

    use tokio::net::TcpListener;

    use super::*;

    #[tokio::test]
    async fn skips_addresses_that_refuse_connections() -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await?;
        let port = listener.local_addr()?.port();
        let addresses = [
            IpAddr::V6(Ipv6Addr::LOCALHOST),
            IpAddr::V4(Ipv4Addr::LOCALHOST),
        ];

        let chosen = first_reachable_address(&addresses, port).await;

        assert_eq!(chosen, Ok(IpAddr::V4(Ipv4Addr::LOCALHOST)));
        Ok(())
    }

    #[tokio::test]
    async fn fails_when_no_address_accepts() -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await?;
        let port = listener.local_addr()?.port();
        drop(listener);

        let chosen = first_reachable_address(&[IpAddr::V4(Ipv4Addr::LOCALHOST)], port).await;

        assert_eq!(chosen, Err(SmtpUnreachable));
        Ok(())
    }

    #[tokio::test]
    async fn fails_without_addresses() {
        assert_eq!(first_reachable_address(&[], 25).await, Err(SmtpUnreachable));
    }
}
