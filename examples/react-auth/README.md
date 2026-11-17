# Example: React app with NelcotaCloud Auth

A small React + Vite app that uses `@nelcota/sdk` for every Auth flow: email and password,
email verification, magic links, password recovery, Google and GitHub with PKCE, TOTP MFA,
profile photos, session listing and account deletion.

## Quickstart

1. **Create a project** in the console (or with `POST /admin/v1/tenants`, see `docs/deploy.md`)
   with the site URL `http://localhost:5174`. Email links and OAuth redirects point under it.
2. **Configure the app** with the project's publishable key (`nc_pk_…`), never the secret key:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   VITE_NELCOTA_URL=http://localhost:8080
   VITE_NELCOTA_PUBLISHABLE_KEY=nc_pk_…
   ```

3. **Run it**:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:5174. Locally, emails arrive in Mailpit (http://localhost:8026).

Google and GitHub need the project's own OAuth app (console → project settings). Register
`{API URL}/auth/v1/oauth/callback` as its callback URL.

## How it works

| Flow                | Where                                                                   | SDK call                                                               |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Client and session  | `src/lib/nelcota.ts`, `src/lib/use-session.ts`                          | `createClient`, `onAuthStateChange`                                    |
| Sign up and sign in | `src/components/password-form.tsx`                                      | `signUp`, `signInWithPassword`                                         |
| MFA step at login   | `src/pages/mfa-page.tsx`                                                | `verifyMfa`                                                            |
| Magic link          | `src/components/email-link-form.tsx`, `src/pages/magic-link-page.tsx`   | `sendMagicLink`, `verifyMagicLink`                                     |
| Email verification  | `src/pages/verify-email-page.tsx`                                       | `verifyEmail`                                                          |
| Password recovery   | `src/pages/reset-password-page.tsx`                                     | `recoverPassword`, `resetPassword`                                     |
| Google and GitHub   | `src/components/oauth-buttons.tsx`, `src/pages/oauth-callback-page.tsx` | `oauth.getAuthorizeUrl`, `oauth.exchangeCode`                          |
| Profile photo       | `src/components/avatar-section.tsx`                                     | `avatar.upload`, `avatar.remove`, `avatar.url`                         |
| Authenticator app   | `src/components/mfa-section.tsx`                                        | `mfa.getStatus`, `mfa.enrollTotp`, `mfa.verifyTotp`, `mfa.disableTotp` |
| Sessions            | `src/components/sessions-section.tsx`                                   | `sessions.list`, `sessions.revoke`, `sessions.revokeOthers`            |

Things every app has to get right, shown here:

- **Email link paths are fixed by the API**: `/auth/verify-email`, `/auth/reset-password` and
  `/auth/magic-link` under the site URL, with the token in the fragment (`#token=…`). Read it,
  then drop it from the address bar.
- **Every login can end in an MFA step**: password, magic link and OAuth all return
  `{ kind: 'mfa_required', mfaToken }` for users with an authenticator app.
- **One-time tokens are redeemed once**: React runs effects twice in development, so the pages
  that redeem links guard against it (`src/lib/use-run-once.ts`).
- **The OAuth callback must open in the tab that started the login**: the PKCE verifier stays in
  that browser's storage.
- **Errors carry a stable `code`** (`NelcotaError`): map it to your own messages.

This example uses the SDK from this repository through a Vite alias. An app outside it installs
`@nelcota/sdk` and drops the alias from `vite.config.ts` and `tsconfig.json`.

## Scripts

`npm run dev`, `npm run build` (type check + bundle), `npm run lint`, `npm run format`,
`npm run format:check`.
