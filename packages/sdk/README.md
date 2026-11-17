# @nelcota/sdk

TypeScript client for NelcotaCloud Auth. No runtime dependencies: it uses `fetch` and WebCrypto.

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
// `app_metadata` claim from the next refresh.
await nelcota.auth.updateUser({ name: 'Ana', theme: 'dark' }) // emits USER_UPDATED

// Session
nelcota.auth.onAuthStateChange((event, session) => {}) // also hears other tabs
const token = await nelcota.auth.getAccessToken() // renewed before it expires
await nelcota.auth.signOut()
```

Also: `verifyEmail`, `resendVerification`, `recoverPassword`, `resetPassword`, `getUser`,
`deleteAccount`, `auth.mfa` (TOTP enroll, verify, disable) and `auth.sessions` (list, revoke,
revoke others). Errors are `NelcotaError` with `status`, `code` and `requestId`.

In browsers, the default storage is `localStorage` so sessions survive reloads. JavaScript on the
same origin can read these tokens; prevent XSS and use a server-managed `HttpOnly` cookie session
when the application requires tokens to be inaccessible to browser scripts.

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
