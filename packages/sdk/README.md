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

## Development

- `npm run api:types` after the API changes (reads `crates/server/openapi.json`).
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`.
