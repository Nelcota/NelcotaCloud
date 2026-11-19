# @nelcota/sdk

TypeScript client for NelcotaCloud Auth and Database. The package uses `fetch` and WebCrypto
and bundles its verification libraries, so consumers install no runtime dependencies.

## Package exports

Use `createClient` to get the configured `auth` and `database` clients. The package also
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

// OAuth (Google, GitHub) with PKCE
location.assign(await nelcota.auth.oauth.getAuthorizeUrl({ provider: 'github', redirectTo }))
// …on the redirect page (throws a NelcotaError such as `access_denied` when the login failed):
await nelcota.auth.oauth.exchangeCode(location.href)

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

When the project turns on the captcha (console: Configurações), render a
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) widget with
`await nelcota.auth.getCaptchaSiteKey()` (`null` when none is needed) and pass its token as
`captchaToken` to `signUp`, `signInWithPassword`, `sendMagicLink`, `recoverPassword` and
`resendVerification`. A token works once: reset the widget after each attempt.

Also: `verifyEmail`, `resendVerification`, `recoverPassword`, `resetPassword`, `getUser`,
`deleteAccount`, `auth.mfa` (TOTP enroll, verify, disable) and `auth.sessions` (list, revoke,
revoke others). Errors are `NelcotaError` with `status`, `code` and `requestId`.

In browsers, the default storage is `localStorage` so sessions survive reloads. JavaScript on the
same origin can read these tokens; prevent XSS and use a server-managed `HttpOnly` cookie session
when the application requires tokens to be inaccessible to browser scripts.

## Database

Each project has its own Postgres database. Tables of its `public` schema are reachable through
the Data API, as the logged-in user (or anonymously without a session): the tables' row level
security policies decide which rows each request sees and writes. New tables start with row level
security on and no policies, so they are closed until a policy opens them.

```ts
type Post = { id: number; title: string; published: boolean }

const { data: posts, count } = await nelcota
  .from<Post>('posts')
  .select('id, title, author:authors(name), comments(body)', { count: 'exact' })
  .eq('published', true)
  .order('created_at', { ascending: false })
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

Enable Cache in the project console and issue a cache credential. Use
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
`user.updated`, `user.deleted`, `user.banned`, `user.unbanned`, `session.revoked`). Create the
endpoint in the console (Webhooks); its `whsec_…` secret is shown once.

```ts
import { WebhookVerificationError, verifyWebhook } from '@nelcota/sdk'

// Express: the raw body is required, a re-serialized one no longer matches the signature.
app.post('/webhooks/nelcota', express.text({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await verifyWebhook({
      payload: req.body,
      headers: req.headers,
      secret: process.env.NELCOTA_WEBHOOK_SECRET,
    })
    // Retries resend the same event: skip ids you already processed.
    if (await alreadyProcessed(req.headers['webhook-id'])) return res.sendStatus(204)
    if (event.type === 'user.created') await createProfile(event.data.user)
    res.sendStatus(204)
  } catch (error) {
    if (error instanceof WebhookVerificationError) return res.sendStatus(400)
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
