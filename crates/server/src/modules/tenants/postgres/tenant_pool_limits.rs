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
    /// The API's Auth and platform pools: the projects with recent requests keep a pool, and a
    /// project past the limit reopens its pool on its next request. Five connections let a
    /// project's concurrent signups and logins run without waiting on each other.
    pub const API: Self = Self {
        connections_per_tenant: 5,
        open_pools: 16,
    };

    /// Data API pools, sized like its session slots: five sessions per project, forty in all.
    pub const DATA_API: Self = Self {
        connections_per_tenant: 5,
        open_pools: 8,
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
    fn api_pools_stay_within_the_instance_budget() {
        /// Tenant connections one API instance may keep open: with two webhook workers and the
        /// control planes, the production server's 280 usable connections keep a margin.
        const API_TENANT_CONNECTION_BUDGET: u64 = 136;
        let cached = TenantPoolLimits::API.max_connections(0);
        let data_api = TenantPoolLimits::DATA_API.max_connections(0);

        assert!(cached.saturating_add(data_api) <= API_TENANT_CONNECTION_BUDGET);
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
