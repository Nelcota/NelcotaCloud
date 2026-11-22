# @nelcota/sdk

TypeScript client for NelcotaCloud Auth, Database, and Storage. The package uses `fetch` and WebCrypto
and bundles its verification libraries, so consumers install no runtime dependencies.

## Package exports

Use `createClient` to get the configured `auth`, `database`, and `storage` clients. The package also
exports their classes, query builders, types, and errors for consumers that reference them
directly. Server applications can use `createAccessTokenVerifier` and `verifyWebhook`
independently of the client.

For internal ownership and type generation, see the
[architecture map](../../docs/architecture.md#sdk-structure).

## Usage

```ts
import { createClient } from '@nelcota/sdk'

const nelcota = createClient({
  url: 'https://api.example.com',
  publishableKey: 'nc_pk_…', // never the secret key
})

// Email and password
const signUp = await nelcota.auth.signUp({ email, password })
const login = await nelcota.auth.signInWithPassword({ email, password })
if (login.kind === 'mfa_required') {
  await nelcota.auth.verifyMfa({ mfaToken: login.mfaToken, code: '123456' })
}

// Magic link: the email opens {site_url}/auth/magic-link#token=…
await nelcota.auth.sendMagicLink({ email })
const magicLinkToken = new URLSearchParams(location.hash.slice(1)).get('token')
if (magicLinkToken !== null) {
  history.replaceState(history.state, '', `${location.pathname}${location.search}`)
  await nelcota.auth.verifyMagicLink({ token: magicLinkToken })
}

// OAuth (Google, GitHub) with PKCE. Register the exact redirectTo URL in the project.
location.assign(await nelcota.auth.oauth.getAuthorizeUrl({ provider: 'github', redirectTo }))

// On the redirect page, clean the address bar before requesting the session.
const oauthCallback = new URL(location.href)
const cleanCallback = new URL(oauthCallback)

for (const parameter of ['code', 'error', 'state', 'nelcota_state']) {
  cleanCallback.searchParams.delete(parameter)
}

history.replaceState(history.state, '', cleanCallback)
const oauthLogin = await nelcota.auth.oauth.exchangeCode(oauthCallback)
// If oauthLogin.kind is 'mfa_required', ask for a TOTP code and call verifyMfa.

// Profile photo: PNG, JPEG or WebP up to 1 MiB, cropped by the server to a centered square
await nelcota.auth.avatar.upload(croppedBlob) // emits USER_UPDATED with the new user
const photoUrl = nelcota.auth.avatar.url(user) // public URL for <img src>, null without a photo
await nelcota.auth.avatar.remove()

// Metadata: the user replaces their own user_metadata (a JSON object, up to 16 KiB).
// app_metadata (roles, plans) is set by the project's admins and arrives in the access token's
// `app_metadata` claim from the next refresh. Keep the person's name under `name` (or
// `full_name`): the console's user list and the users CSV export show it beside the email.
await nelcota.auth.updateUser({ name: 'Ana', theme: 'dark' }) // emits USER_UPDATED

// Session
nelcota.auth.onAuthStateChange((event, session) => {}) // also hears other tabs
const token = await nelcota.auth.getAccessToken() // renewed before it expires
await nelcota.auth.signOut()
```

The server's OAuth callback URL is displayed in the console's **Login social** page and is
registered at Google or GitHub. The app's `redirectTo` is registered separately in the same
page. An empty app callback list allows the project's exact site URL. Query parameters that
belong to the app are part of the registered URL. To retry a transient exchange failure, use
the captured callback URL while its verifier and code are valid. Serve the callback page
with `Referrer-Policy: no-referrer` and keep the captured URL out of telemetry.

Google email addresses that Google does not manage cannot create or automatically link an
identity. The app receives `email_confirmation_required` and can offer password or magic-link
sign-in. Google identities previously linked by their stable provider ID can still sign in.

When the project turns on the captcha (console: Configurações), render a
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) widget with
`await nelcota.auth.getCaptchaSiteKey()` (`null` when none is needed) and pass its token as
`captchaToken` to `signUp`, `signInWithPassword`, `sendMagicLink`, `recoverPassword` and
`resendVerification`. A token works once: reset the widget after each attempt.

Also: `verifyEmail`, `resendVerification`, `recoverPassword`, `resetPassword`, `getUser`,
`deleteAccount`, `auth.mfa` (TOTP enroll, verify, disable) and `auth.sessions` (list, revoke,
revoke others). Errors are `NelcotaError` with `status`, `code` and `requestId`. When the API
requests backoff, `retryAfterSeconds` gives the wait in seconds.

In browsers, the default storage is `localStorage` so sessions survive reloads. JavaScript on the
same origin can read these tokens; prevent XSS and use a server-managed `HttpOnly` cookie session
when the application requires tokens to be inaccessible to browser scripts.

## Storage

Use `client.storage` while signed in to list private buckets, upload files, page through the user's
files, get short-lived download URLs, and delete files. See the [Project Storage guide](../../docs/project-storage.md)
for the SDK example and the R2 setup.

## Database

Each project has its own Postgres database. Tables of its `public` schema are reachable through
the Data API, as the logged-in user (or anonymously without a session): the tables' row level
security policies decide which rows each request sees and writes. New tables start with row level
security on and no policies, so they are closed until a policy opens them.

Functions in `public` called through `rpc` usually run with the caller's privileges.
`SECURITY DEFINER` routines execute with their owner's privileges and require an explicit
`EXECUTE` grant for each app role that should call them. Applying the database migration
removes existing app-role and `PUBLIC` grants on these routines. Review and reissue any
intended grants. When creating, replacing, or altering a privileged routine, put intentional
grants after its definition or alteration in the same migration.

```ts
type Post = { id: number; title: string; published: boolean }

const { data: posts, count } = await nelcota
  .from<Post>('posts')
  .select('id, title, author:authors(name), comments(body)', { count: 'exact' })
  .eq('published', true)
  .order('created_at', { ascending: false })
  .order('id')
  .order('id', { referencedTable: 'comments' })
  .range(0, 19) // at most 1000 rows per request
  .execute()

const { data: post } = await nelcota.from<Post>('posts').select().eq('id', 7).single().execute()

await nelcota.from<Post>('posts').insert({ title: 'Hello' }).execute()
const { data: saved } = await nelcota
  .from<Post>('posts')
  .upsert([{ id: 7, title: 'Edited' }], { onConflict: 'id' })
  .select('id, title')
  .execute()
await nelcota.from<Post>('posts').update({ published: true }).eq('id', 7).execute()
await nelcota.from<Post>('posts').delete().eq('id', 7).execute() // updates and deletes need a filter

const { data: total } = await nelcota.rpc<number>('add_numbers', { a: 1, b: 2 })
```

Filters: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`/`ilike` (`*` is the wildcard), `is`,
`in`, `contains`, `containedBy`, `overlaps`, `not`, `or` (`'age.lt.18,and(a.eq.1,b.eq.2)'`) and
`match`. A filter on an embed names it: `.eq('comments.approved', true)`. Policies use
`auth.uid()` (the user's id), `auth.jwt()` (the access token's claims, `app_metadata`
included) and `auth.role()` (`anon` or `authenticated`):

```sql
CREATE POLICY own_posts ON posts FOR ALL TO nelcota_authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
```

## Project cache (on your server)

Enable Cache and issue a cache credential through the project management API. Use
`createCacheClient({ url, token })` from application-server code. The client supports
`get(key)`, `set(key, value, ttlSeconds?)`, and `delete(key)`. A miss returns `null`.
A cached JSON null returns `{ value: null }`. Other API failures throw `NelcotaError`.

See the [project cache guide](../../docs/project-cache.md) for a complete example with fallback
to the source of truth.

## Access tokens (on your server)

Your app sends the user's access token (`await nelcota.auth.getAccessToken()`) to your own API
as `Authorization: Bearer …`. Check it there before trusting the request:

```ts
import { AccessTokenVerificationError, createAccessTokenVerifier } from '@nelcota/sdk'

// Create it once: it keeps the project's public keys and reloads them after a rotation.
const verifyAccessToken = createAccessTokenVerifier({
  url: 'https://api.example.com',
  publishableKey: process.env.NELCOTA_PUBLISHABLE_KEY,
  projectId: process.env.NELCOTA_PROJECT_ID, // shown in the console's overview
})

app.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '') ?? ''
    req.user = await verifyAccessToken(token) // { sub, email, sid, app_metadata, … }
    next()
  } catch (error) {
    if (error instanceof AccessTokenVerificationError) return res.sendStatus(401)
    throw error
  }
})
```

- `app_metadata` (roles, plans) is set by the project's admins and reaches new tokens on the
  next refresh. Authorize with it, never with `user_metadata`, which users write themselves.
- A token stays valid until it expires (15 minutes), even after a logout or a ban. Check with
  the API (`GET /auth/v1/user`) when a request must see that at once.
- Needs a runtime with Ed25519 in WebCrypto: Node 22+, Deno, Bun or Cloudflare Workers.

## Webhooks (on your server)

NelcotaCloud calls your endpoint with a signed `POST` when users change (`user.created`,
`user.updated`, `user.deleted`, `user.banned`, `user.unbanned`, `session.revoked`) or when a
subscribed `audit.event` occurs. Create the endpoint in the console (Webhooks) and save its
one-time `whsec_…` secret.

For a PostgreSQL-backed receiver, create this table in the same database where you apply the event:

```sql
CREATE TABLE processed_webhooks (id text PRIMARY KEY);
```

The example uses a `pg` pool and a `createProfile(client, user)` function that writes through
the supplied transaction client.

```ts
import { WebhookVerificationError, verifyWebhook } from '@nelcota/sdk'

const secret = process.env.NELCOTA_WEBHOOK_SECRET

if (secret === undefined) {
  throw new Error('Set NELCOTA_WEBHOOK_SECRET.')
}

// Express: the raw body is required, a re-serialized one no longer matches the signature.
app.post('/webhooks/nelcota', express.text({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await verifyWebhook({
      payload: req.body,
      headers: req.headers,
      secret,
    })
    const id = req.get('webhook-id')

    if (id === undefined) {
      res.sendStatus(400)
      return
    }

    if (event.type === 'user.created') {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const claim = await client.query(
          'INSERT INTO processed_webhooks (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
          [id],
        )

        if (claim.rowCount === 1) {
          await createProfile(client, event.data.user)
        }

        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    res.sendStatus(204)
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      res.sendStatus(400)
      return
    }

    throw error
  }
})
```

- Answer 2xx within 10 seconds and do slow work afterwards; anything else is retried for about
  a day and a half (5 s, 5 min, 30 min, 2 h, 5 h, 10 h, 10 h).
- Delivery is at least once and not ordered: use `webhook-id` to drop duplicates and the event
  `timestamp` to ignore stale updates.
- The format is [Standard Webhooks](https://www.standardwebhooks.com/), so its libraries for
  other languages verify these requests too.
- After a secret rotation both secrets sign for 24 hours; switch your server within that day.

## Development

- `npm run api:types` after the API changes (reads `crates/server/openapi.json`).
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`.
