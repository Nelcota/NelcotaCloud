/// How many tenant pools one process keeps open, and how many connections each may hold.
///
/// With one database per tenant, connections multiply by the number of tenants a process
/// touches; these limits keep each process's share of the server's `max_connections` fixed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TenantPoolLimits {
    pub connections_per_tenant: u32,
    pub open_pools: u64,
}

impl TenantPoolLimits {
    /// The API answers requests for any project at once: many small pools.
    pub const API: Self = Self {
        connections_per_tenant: 5,
        open_pools: 1_000,
    };

    /// The webhook worker handles a few tenants at a time, so it keeps only a few pools: its
    /// connections stay bounded however many projects exist, and its replicas fit beside the API.
    pub const WEBHOOK_WORKER: Self = Self {
        connections_per_tenant: 2,
        open_pools: 8,
    };

    /// The most tenant connections the process can hold: its cached pools, plus pools evicted
    /// while a run still uses them (they close when that run lets go).
    pub fn max_connections(self, tenants_in_flight: u64) -> u64 {
        let pools = self.open_pools.saturating_add(tenants_in_flight);

        pools.saturating_mul(u64::from(self.connections_per_tenant))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_cached_and_in_flight_pools() {
        let limits = TenantPoolLimits {
            connections_per_tenant: 2,
            open_pools: 8,
        };

        assert_eq!(limits.max_connections(0), 16);
        assert_eq!(limits.max_connections(8), 32);
    }

    #[test]
    fn saturates_instead_of_overflowing() {
        let limits = TenantPoolLimits {
            connections_per_tenant: u32::MAX,
            open_pools: u64::MAX,
        };

        assert_eq!(limits.max_connections(1), u64::MAX);
    }
}
