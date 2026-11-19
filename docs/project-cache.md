# Project Cache

Project owners can enable Cache from the console. Issue a credential for each backend and store
the token in that backend's secret store. The console displays the token once. The token grants
access to the issuing project's cache. Projects start with caching disabled.

## Application integration

Use HTTPS from your application backend to the NelcotaCloud API. The backend owns the data
source and can rebuild entries after eviction, expiry, or a restart. Configure
`NELCOTA_API_URL` and `NELCOTA_CACHE_TOKEN` in the backend environment.

```ts
import { createCacheClient, type CacheValue } from '@nelcota/sdk'

const url = process.env.NELCOTA_API_URL
const token = process.env.NELCOTA_CACHE_TOKEN

if (url === undefined || token === undefined) {
  throw new Error('Set NELCOTA_API_URL and NELCOTA_CACHE_TOKEN.')
}

const cache = createCacheClient({ url, token })

function reportCacheFailure(): null {
  console.warn('Project cache request failed')

  return null
}

export async function readCatalog(loadProducts: () => Promise<CacheValue>): Promise<CacheValue> {
  const key = 'catalog:products'
  const hit = await cache.get(key).catch(reportCacheFailure)

  if (hit !== null) {
    return hit.value
  }

  const products = await loadProducts()
  await cache.set(key, products, 60).catch(reportCacheFailure)

  return products
}
```

Use `cache.delete(key)` when a committed change makes the entry obsolete. Deleting a missing
entry succeeds. The SDK applies a 1.5-second timeout and allows plain HTTP on loopback for
development. API faults surface as `NelcotaError` with a status, code and request ID.

## HTTP API

Send `Authorization: Bearer <cache credential>` and `Content-Type: application/json`.

| Route | JSON body | Result |
| --- | --- | --- |
| `POST /cache/v1/get` | `{ "key": "catalog:products" }` | `200` with `{ "value": ... }`, or `404 cache_miss` |
| `POST /cache/v1/set` | `{ "key": "catalog:products", "value": [], "ttl_seconds": 60 }` | `204` |
| `POST /cache/v1/delete` | `{ "key": "catalog:products" }` | `204` |

Keys can be up to 256 UTF-8 bytes. Values can be any JSON value up to 64 KiB after serialization.
TTL defaults to 300 seconds and accepts 1–3,600 seconds. A project gets a burst of 100 operations
and replenishes at 50 operations per second on the current single API instance. A project can
have up to 10 credentials. The API checks credentials and the namespace generation in PostgreSQL
on every operation. Each API instance uses a dedicated pool of up to three connections and waits
up to 250 ms to acquire one before returning `503 cache_unavailable`. Rotate by issuing a
replacement, switching the application to it, and revoking the old one.

Clearing a project or disabling its cache invalidates its current entries immediately for
subsequent requests. The former entries expire by TTL, with a maximum of one hour. Disabling
pauses all cache credentials. Re-enabling restores credential access to an empty namespace.
Deleting the project revokes its credentials permanently.

## Deploy and pilot

1. In the target environment file, set `COMPOSE_PROFILES=cache` and `VALKEY_PASSWORD` to
   a new 64-character lowercase hex secret. Set `CACHE_VALKEY_URL` as shown in
   [the production environment example](../.env.production.example). Bring the stack up
   with the usual Compose deployment command. The Valkey port stays on the internal network.
2. In staging, enable the feature for one or two test projects and integrate a reconstructible
   read such as a product catalog. Compare p95 application latency and source query volume
   with the uncached baseline. Use API request logs for per-project read latency and hit rate
   (200 responses divided by 200 plus 404 responses at `/cache/v1/get`).
   Track `503 cache_unavailable` separately.
3. Monitor `used_memory` in Valkey `INFO memory`, and `evicted_keys` and `expired_keys` in
   `INFO stats`. Production starts at 128 MiB of cache data with shared LRU eviction. Under
   memory pressure, a busy project can cause another project's cold entries to be removed.
4. Stop Valkey in staging and confirm cache responses return `503`, applications fall back to
   their source, and Auth, Data API and readiness continue to respond. Restart Valkey and
   confirm new writes can be read. Its data is ephemeral.

To halt the pilot for a project, disable Cache in the console. To retire the service for an
environment, stop the Valkey service while its Compose profile is enabled, then remove the
profile and `CACHE_VALKEY_URL` from that environment and recreate the API.
