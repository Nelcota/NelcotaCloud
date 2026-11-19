use std::fmt;
use std::net::IpAddr;

/// The widest IPv4 range one entry may block (/16, 65,536 addresses): wider ranges would lock
/// out whole providers, including the project's own users.
const MIN_IPV4_PREFIX: u8 = 16;
/// The widest IPv6 range one entry may block (/48, one site).
const MIN_IPV6_PREFIX: u8 = 48;
const IPV4_BITS: u8 = 32;
const IPV6_BITS: u8 = 128;

/// An address or a range to block, already checked: `203.0.113.7` or `203.0.113.0/24`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BlockedNetwork {
    address: IpAddr,
    prefix: u8,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum BlockedNetworkError {
    #[error("not an IP address or a CIDR range")]
    Invalid,
    #[error("the range is too wide: at most /16 for IPv4 and /48 for IPv6")]
    TooWide,
}

impl BlockedNetwork {
    pub fn parse(text: &str) -> Result<Self, BlockedNetworkError> {
        let text = text.trim();
        let (address_text, prefix_text) = match text.split_once('/') {
            Some((address, prefix)) => (address, Some(prefix)),
            None => (text, None),
        };
        let address: IpAddr = address_text
            .parse()
            .map_err(|_| BlockedNetworkError::Invalid)?;
        let bits = address_bits(address);
        let prefix = match prefix_text {
            Some(prefix) => prefix
                .parse::<u8>()
                .map_err(|_| BlockedNetworkError::Invalid)?,
            None => bits,
        };

        if prefix > bits {
            return Err(BlockedNetworkError::Invalid);
        }

        if prefix < min_prefix(address) {
            return Err(BlockedNetworkError::TooWide);
        }

        Ok(Self { address, prefix })
    }
}

/// Postgres keeps the range itself (`network()` clears the host bits) and prints it back.
impl fmt::Display for BlockedNetwork {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}/{}", self.address, self.prefix)
    }
}

fn address_bits(address: IpAddr) -> u8 {
    match address {
        IpAddr::V4(_) => IPV4_BITS,
        IpAddr::V6(_) => IPV6_BITS,
    }
}

fn min_prefix(address: IpAddr) -> u8 {
    match address {
        IpAddr::V4(_) => MIN_IPV4_PREFIX,
        IpAddr::V6(_) => MIN_IPV6_PREFIX,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_single_addresses_as_full_length_ranges() -> Result<(), BlockedNetworkError> {
        assert_eq!(
            BlockedNetwork::parse(" 203.0.113.7 ")?.to_string(),
            "203.0.113.7/32"
        );
        assert_eq!(
            BlockedNetwork::parse("2001:db8::1")?.to_string(),
            "2001:db8::1/128"
        );
        Ok(())
    }

    #[test]
    fn reads_ranges_down_to_the_widest_allowed() -> Result<(), BlockedNetworkError> {
        assert_eq!(
            BlockedNetwork::parse("203.0.113.0/24")?.to_string(),
            "203.0.113.0/24"
        );
        assert_eq!(
            BlockedNetwork::parse("10.1.0.0/16")?.to_string(),
            "10.1.0.0/16"
        );
        assert_eq!(
            BlockedNetwork::parse("2001:db8::/48")?.to_string(),
            "2001:db8::/48"
        );
        Ok(())
    }

    #[test]
    fn refuses_ranges_wider_than_a_provider_block() {
        assert_eq!(
            BlockedNetwork::parse("10.0.0.0/8"),
            Err(BlockedNetworkError::TooWide)
        );
        assert_eq!(
            BlockedNetwork::parse("0.0.0.0/0"),
            Err(BlockedNetworkError::TooWide)
        );
        assert_eq!(
            BlockedNetwork::parse("2001:db8::/32"),
            Err(BlockedNetworkError::TooWide)
        );
    }

    #[test]
    fn refuses_text_that_is_not_an_address_or_range() {
        for text in [
            "",
            "localhost",
            "203.0.113.7/33",
            "203.0.113.7/",
            "1.2.3.4/x",
            "::1/129",
        ] {
            assert_eq!(
                BlockedNetwork::parse(text),
                Err(BlockedNetworkError::Invalid),
                "{text}"
            );
        }
    }
}
