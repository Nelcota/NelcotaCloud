# Project Cache

Project Cache stores short-lived JSON for application backends. For a self-hosted API, configure
[Valkey in the deployment](deploy.md#project-cache) before enabling the feature.

## Enable the cache and issue a credential

Use the project owner's platform session access token to call the project management API. Find the
project ID in the console's project URL. Set `NELCOTA_URL`, `NELCOTA_PROJECT_ID` and
`NELCOTA_PLATFORM_ACCESS_TOKEN` in your shell, then run:

```bash
cache_url="${NELCOTA_URL}/platform/v1/projects/${NELCOTA_PROJECT_ID}/cache"

curl --fail-with-body --request PUT "$cache_url" \
  --header "Authorization: Bearer $NELCOTA_PLATFORM_ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"enabled":true}'

curl --fail-with-body --request POST "$cache_url/credentials" \
  --header "Authorization: Bearer $NELCOTA_PLATFORM_ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Application backend"}'
```

The second response includes a credential ID and a token beginning with `nc_cache_`. Copy the
token to your application server's secrets as `NELCOTA_CACHE_TOKEN`. The API returns the token
only at issuance. Keep the credential ID for rotation or revocation.

Use the same owner authorization to read settings with `GET` on the cache URL, invalidate the
project's entries with `POST /clear`, or revoke a credential with
`DELETE /credentials/{credential_id}`. The last two paths are relative to the cache URL above.

## Use the SDK with a fallback

The application server uses the cache credential for `get`, `set` and `delete`. A miss resolves
to `null`. A stored JSON null resolves to `{ value: null }`. Entries expire after 300 seconds by
default and accept a TTL between 1 and 3,600 seconds. The serialized JSON value in the request
is limited to 64 KiB.

```ts
import { createCacheClient, type CacheValue } from '@nelcota/sdk'

const url = process.env.NELCOTA_URL
const token = process.env.NELCOTA_CACHE_TOKEN

if (url === undefined || token === undefined) {
  throw new Error('Set NELCOTA_URL and NELCOTA_CACHE_TOKEN.')
}

const cache = createCacheClient({ url, token })

export async function readProduct(
  id: string,
  readFromDatabase: (id: string) => Promise<CacheValue>,
): Promise<CacheValue> {
  const key = `product:${id}`
  const hit = await cache.get(key).catch(() => null)

  if (hit !== null) {
    return hit.value
  }

  const product = await readFromDatabase(id)
  await cache.set(key, product, 60).catch(() => undefined)

  return product
}
```
