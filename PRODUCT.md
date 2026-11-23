# Product

## Platform

web

## Users

Product and engineering teams at Brazilian startups and small-to-mid companies that need managed,
multitenant authentication for the apps they build. They use the console to create a project per
app, connect it (publishable and secret keys, site URL, OAuth, SMTP), and then manage that app's
users and settings day to day. Console accounts can own or be members of several projects.

## Product Purpose

NelcotaCloud is a Backend-as-a-Service; its first product is Auth. Each project is the Auth of one
app: its own users, keys, social login, email delivery and signing keys. Success means a team
connects its app quickly, trusts the isolation of its data, and rarely needs to open the console
again except to manage users or rotate credentials.

## Positioning

- Built in and for Brazil: Portuguese-native product and copy, aimed at the Brazilian market.
- Real per-tenant isolation: one Postgres database per project, tenant secrets encrypted and bound
  to their context, each project's own OAuth apps and SMTP server.
- Cost: positioned as cheaper or more predictable than the foreign alternatives (Supabase,
  Firebase, Clerk). No pricing is defined yet; never publish prices or plan names.

## Operating Context

- Console (`apps/console/`): React SPA that talks only to the public API, signed in through the
  platform tenant with the SDK. Sections per project: overview, API keys, users, project
  settings (site URL, email verification rule, SMTP), plus account and system status.
- SDK (`@nelcota/sdk`) is what tenant apps embed; the console is where teams configure it.
- Typical tasks: create a project, copy keys once (secret keys are shown only at creation),
  configure OAuth and SMTP, search and administer users (ban, sessions), rotate signing keys,
  revoke API keys.

## Capabilities and Constraints

- Auth features: email + password, email verification, password reset, magic links, Google and
  GitHub OAuth with PKCE, TOTP MFA, session listing and revocation, admin user management.
- Destructive actions (revoke, delete, ban, rotate) always require explicit confirmation.
- Secrets are never shown in the browser beyond the one-time reveal; never design flows that
  re-display a secret key.
- Up to 10 owned projects per console account.
- The console UI is currently Portuguese (Brazil) only; whether to add other languages is
  undecided.
- Future BaaS products (storage, database, functions) will join as new modules; the console
  should be able to grow sections without a rewrite.

## Brand Commitments

- Name: NelcotaCloud.
- The logo at `docs/brand/nelcota-logo.png` (also `apps/console/public/nelcota-logo.png`) is final
  and must not be redrawn or altered.
- Voice: direct, plain Brazilian Portuguese that explains consequences in one sentence (e.g. "Ela
  para de funcionar na hora. Apps que ainda a usam deixam de acessar a API.").

## Evidence on Hand

- Logo and favicons: `docs/brand/`, `apps/console/public/`.
- No customers, testimonials, case studies, benchmarks, uptime figures or pricing exist yet. Do
  not fabricate any of them.

## Product Principles

1. Trust is the product: every screen should make isolation, secrets and destructive
   consequences legible before the action, not after.
2. Get the app connected fast: the path from new project to working keys is the shortest one in
   the console.
3. Speak Brazilian Portuguese natively, never as a translation of a foreign console.
4. Essential over exhaustive: show what a team needs to operate its Auth, nothing that exists only
   to look complete.

## Accessibility & Inclusion

WCAG 2.2 AA is a requirement: contrast, full keyboard operation with visible focus, screen reader
labels, and respect for reduced motion.
