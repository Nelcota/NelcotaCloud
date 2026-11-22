# Project Guidelines

## Communication

- Always talk to me in Portuguese (Brazil).
- Code, comments, identifiers, and everything in git are in English.

## Project

NelcotaCloud: a Backend-as-a-Service written in Rust. Products: multitenant Auth and Database
(each project's Postgres as a REST API under row level security).

- Control plane database: tenants, API key hashes (with a hint of their last characters;
  publishable keys, which are public, are also kept in full so the console shows them again), JWT
  signing keys, OAuth configs, pending OAuth authorizations, tenant SMTP settings, and
  `tenant_members` (which console accounts manage which tenant, as owner or member).
- One Postgres database per tenant (`tenant_<slug>`): the platform's tables (users, identities,
  refresh and one-time tokens, TOTP factors, MFA challenges, audit, webhook outbox) live in the
  `auth` schema (the platform's pool searches only `auth`); the project's own tables live in
  `public`, served by the Data API.
  Its URL is derived from the slug and the current `TENANT_DATABASE_BASE_URL`, never stored.
- Provisioning holds a per-slug advisory lock in the registration transaction; a database without a
  tenant row is an orphan that the next provisioning of the slug recreates.
- Tenant secrets (signing keys, OAuth client secrets, PKCE verifiers, SMTP URLs, TOTP secrets) are
  encrypted with AES-GCM,
  each bound to a context (tenant, record) as associated data.
- Access tokens: short-lived EdDSA JWTs signed with the tenant's active key, public keys as JWKS.
  Refresh tokens: opaque, rotated on every use, stored only as SHA-256 hashes, grouped in families.
- Ending sessions writes markers checked when a refresh token is used (`revoked_token_families`,
  `users.sessions_invalidated_at`), so successors created by a concurrent refresh are refused too.
- Concurrency: paths that change a user lock its `users` row before its token rows (never the
  reverse), expiries are computed with the database clock (`now() + interval`), and login keeps
  the checked password hash locked (`FOR NO KEY UPDATE`) while it stores the new session and
  its last sign-in timestamp.
- Each tenant has a required `site_url`: email links point to it and OAuth only redirects under it.
- Auth emails (verification, password reset, magic link) are HTML + text (askama template
  `templates/auth_email.html`, auto-escaped), sent in the background through the tenant's own SMTP
  server when configured (`tenants/smtp`), the platform's otherwise. Tenant SMTP hosts must be
  public, on an SMTP port and use TLS (`smtps://` or `smtp://…?tls=required`) (SSRF guard,
  re-checked when a sender is built); the sender is pinned to the first checked address that
  accepts a connection, and is built inside the background task so requests never reveal
  whether an email was sent. `TENANT_SMTP_ALLOW_ANY_HOST=true` lifts the guard for local
  development only. Each project may reword the three link emails (`tenant_email_templates`,
  `/auth/v1/admin/email-templates/{kind}`): plain-text subject, heading, message, button and
  note, `{app_name}` replaced by the project name; the layout and the link stay the platform's,
  one-line fields refuse control characters (header injection), and every field refuses links
  and domain names (the emails go out with the platform's reputation, so custom words must not
  point readers anywhere but the button).
- Every way to obtain tokens ends in `complete_login` (password, magic link, OAuth): users with a
  verified TOTP factor get `{mfa_required, mfa_token}` instead, redeemed at `/auth/v1/mfa/challenge`
  (5 wrong codes per challenge, each TOTP time step accepted once). `issue_session_with` refuses
  banned users. Access tokens carry `sid` (the session, i.e. refresh token family).
- Magic links sign unknown emails up (passwordless account); opening one verifies the email and,
  on an unverified account, drops its password and ends its sessions (like an OAuth takeover).
- Key rotation: API keys are created and revoked individually (at most 20 active per project;
  the last active secret key cannot be revoked); rotating the signing key keeps retired keys in
  the JWKS for a day (at most 5 at once), and they stop verifying after that day even if nobody
  rotates again. Keys sent in URLs (avatar links, OAuth start) must be publishable
  (`ApiKeyTenant::resolve_publishable`).
- OAuth (Google, GitHub) uses each tenant's own OAuth app, PKCE and a one-time `state`. The callback
  returns a short-lived one-time code to the app, never tokens in the URL; the app redeems it with
  its own PKCE verifier (`code_challenge` at `/authorize`, `code_verifier` at `/oauth/token`).
  Provider endpoints are injectable (`build_app_state_with_endpoints`) so tests use a fake provider.
- Account linking by verified email refuses a second identity of the same provider, and taking over
  an unverified account drops its password and ends its sessions. A new signup for an unverified
  email takes the account over (latest signup wins until someone verifies the inbox).
- Admin routes (`/auth/v1/admin/*`) use `TenantAdmin`/`TenantAdminContext`: either the tenant's
  secret key, or a console account's access token plus `x-nelcota-project`, with membership checked
  on every request. Console accounts are users of the platform tenant named by
  `PLATFORM_TENANT_SLUG`; `/platform/v1/projects` lists, creates (owner, max 10 per account) and
  deletes (owners only) their projects. Owners invite people by email
  (`tenant_invitations`, accepted by the console account with that verified email, joining as
  member) and remove members; `tenant_members.account_email` is refreshed when the account lists
  its projects. Owners change roles (`PATCH .../members/{account_id}`) and anyone leaves
  (`DELETE .../membership`), and an owner hands the project over in one transaction
  (`POST .../ownership-transfer`); all lock the project's memberships so it always keeps an owner
  (`last_owner`), and promotion respects the 10-owned-projects limit (`owned_project_limit`).
  Ownership is never handed out by invitation: invite as member, then promote.
- User administration: the list filters by `status` (`unverified`, `banned`); a user's detail
  reads their active sessions with the last login (newest refresh token family) and their linked
  identities (provider and date only); `POST .../users/{id}/verification-email` resends the
  verification link to an unverified, unbanned user under the public per-address email limit.
  The console shows them at `/projects/$projectId/users/$userId`.
- User metadata (`auth/user/user_metadata*`): two JSON objects on `users`. `user_metadata`
  (up to 16 KiB, no NUL characters) is replaced by the user (`PATCH /auth/v1/user`, which refuses `app_metadata`)
  or an admin; `app_metadata` (up to 4 KiB) only by admins (`PATCH /auth/v1/admin/users/{id}`)
  and is copied into access tokens as the `app_metadata` claim, so it reaches apps on the next
  login or refresh. Both changes report `user.updated`. The console edits them on the user page.
- Activity log (`auth/audit`): the tenant's `audit_events` (90 days, pruned when read and, a
  hundred oldest rows at a time, on each insert) records logins (with method and client IP),
  wrong-password attempts (with the typed email only when it is a valid address: anything else
  may be a mistyped password; linked to the account it names, for the log only), password
  resets and admin actions on users with who did them (`AdminActor`: secret key or console
  account). Recorded after the action; a failed insert is logged, never failing the request.
  `GET /auth/v1/admin/audit-events` pages by `before` (event id); the console shows it at
  `/projects/$projectId/activity` and on each user's page.
- Captcha (`tenants/captcha`): a project may require Cloudflare Turnstile (`PUT/DELETE
  /auth/v1/admin/captcha`; the secret is checked with Cloudflare, then encrypted). Signup,
  password login and the emailed-link requests then need `captcha_token`, checked after the rate
  limit; Cloudflare unreachable refuses with 503 (fails closed). Apps read the site key at
  `GET /auth/v1/captcha`. The console does not render the widget, so never enable it on the
  platform tenant. Tests point `CAPTCHA_VERIFY_URL` at a fake.
- Usage (`auth/usage`): `GET /auth/v1/admin/usage` counts monthly active users (UTC calendar
  months) from the refresh tokens created in the month, so logins and renewals by any method
  count; the console overview shows this month and last month.
- Profile photos (`auth/avatar`): `PUT/DELETE /auth/v1/user/avatar` take the raw image (PNG,
  JPEG, WebP, up to 1 MiB); the server decodes it with `image` (size limits against decompression
  bombs), crops it to a 256px square and re-encodes it as JPEG (no EXIF), stored in the tenant's
  `user_avatars`. `GET /auth/v1/users/{id}/avatar?apikey=<publishable key>&version=…` serves it
  publicly (secret keys are refused in URLs); `User.avatar_updated_at` is the version. The console
  crops in a modal (`react-easy-crop`) and uploads through the SDK (`auth.avatar`).
- Tenant settings (`GET/PATCH /auth/v1/admin/settings`): name, `site_url`,
  `require_email_verification` (default true: password login and refresh need a verified email,
  and signup answers the same for new and existing emails).
- Routes that only touch tenant configuration use `ApiKeyTenant` or `TenantAdmin` (no tenant
  database needed); routes on tenant data use `TenantContext` or `TenantAdminContext`.
- Webhooks (`webhooks`, Standard Webhooks format): up to 5 endpoints per tenant in the control
  plane (`webhook_endpoints`, secret encrypted, previous secret signing for a day after a
  rotation). Events (`user.created/updated/deleted/banned/unbanned`, `session.revoked`) are
  written by `WebhookRecorder` to the tenant's outbox (`webhook_events`, `webhook_deliveries`)
  inside the same transaction as the change; build the recorder before the transaction
  (`state.webhooks.recorder(tenant_id)`) and record with `user_events`. Dropping it after the
  commit wakes the worker. The worker reads only `webhook_schedule` in the control plane and
  opens a tenant database when it has deliveries due; it claims them with
  `FOR UPDATE SKIP LOCKED` in a transaction held while sending (a dead worker releases them),
  at most 2 per endpoint per batch, one request at a time per endpoint, and retries with
  jitter for about 28 hours. A hint always sets the schedule to `now()`. Deleting or
  disabling an endpoint gives up its pending deliveries on the next run; the schedule also
  wakes for retention (7 days). A sweep every 5 minutes recovers lost wake-ups. Test events
  and resends are rate limited per project. Receivers must be https on public addresses,
  checked at save and again by the client's DNS resolver on every request (no redirects, no
  proxy); `WEBHOOK_ALLOW_PRIVATE_HOSTS=true` lifts it for local development only.
- Database (`modules/database`, Data API at `/rest/v1`, PostgREST-style): the request roles
  `nelcota_anon` (publishable key), `nelcota_authenticated` (plus a user's access token; claims
  in `request.jwt.claims`, read by `auth.uid()`, `auth.jwt()`, `auth.role()`), `nelcota_service`
  (secret key, or a console member with `x-nelcota-project`; BYPASSRLS) and `nelcota_developer`
  (owner of `public`, BYPASSRLS, never superuser) are server-wide NOLOGIN roles created at
  startup. Each project's Data API pool logs in as its own role `nelcota_t_<slug>` (NOINHERIT,
  password derived from the server password, created or repaired when the pool opens, dropped
  with the database, the only role allowed to connect), so SQL that falls back to the login role
  (`RESET ROLE`, `COMMIT`) never reaches another project. Each request is one transaction
  switched with `set_config(..., true)`; GETs are read-only; statement timeouts per role
  (5/8/30 s, 15 s for the console's SQL) and a `QueryGuard` that terminates the backend (matched
  by pid and start time) through the platform's pool if a function lifts the timeout. At most
  40 sessions run at once per instance and 5 per project (`SessionSlots`; waiting over 5 s
  answers 503). Every table created in `public` gets
  row level security on, views get `security_invoker` and materialized views lose the request
  roles' access (event trigger); every DDL bumps `auth.schema_version`
  (`auth.current_schema_version()`), which keys the per-project `SchemaCache`. Client names are
  only looked up in that cache and quoted; values are bound and cast by Postgres to the column
  type; responses are JSON built by Postgres (`json_agg`, at most 16 MiB, measured there),
  embeds are `LATERAL` subqueries over foreign keys or a linking table, at most 1000 rows per
  response, writes need a filter for update/delete and refuse `limit`/`offset`, and inserts are
  grouped by the columns each row sets (one statement per group, in order) so left-out columns
  take their defaults. Publishable-key requests are rate limited per project and client IP,
  secret-key and console ones per project (`auth/rate_limiting`). Filters, order or pages named
  after an embed missing from `select` are refused (they would be ignored); `not.or`/`not.and`
  negate groups; `in.()` matches nothing. Errors map SQLSTATE to stable codes (`permission_denied`,
  `unique_violation`, ...); the console's SQL editor (and its schema overview, which never runs
  as the superuser) passes Postgres's message on and keeps at most 1000 rows / 4 MiB of values;
  a last query that found no rows shows its own empty header (prepared again, never re-run).
- Rate limits (`governor`, in memory, single instance; quotas in `rate_limit_quotas.rs`) on
  signup, login (per email from one network, per email, per client IP), the Argon2 work a client
  causes across projects, MFA codes, auth emails (per address, per recipient across projects,
  per project), token and code redemption, OAuth start, invitations, project creation, profile
  and avatar changes, and Data API requests, plus a global per-client-IP limit on every request
  (`request_limit.rs`). Keys are tenant + email and tenant + client IP (IPv6 per /64). Refusals
  are 429 with `Retry-After`. Argon2 and avatar decoding run behind semaphores (busy: 503);
  request bodies time out after 30 s and requests after 60 s. Behind Cloudflare set
  `CLIENT_IP_HEADER=cf-connecting-ip`.
- Signing keys (5 minutes), API key owners (`ApiKeyCache`, 60 s, only keys that exist), SMTP
  senders and tenant pools while in use are cached with `moka`
  (`TenantPoolRegistry`): concurrent misses share one load. Caches whose entries a change must
  drop use a per-tenant `CacheGeneration` advanced after the change commits (entries keyed by
  it, or checked against a snapshot taken before loading), so a load in flight never puts a
  stale value back and one tenant's change never empties the others' entries.
- Team changes (role, removal, invitation, cancellation) check that the actor is still an owner
  inside the statement or transaction that locks the project's memberships (in account order,
  as project deletion does); OAuth linking and magic links read the user `FOR UPDATE` before
  deciding on it.
- Every response carries a server-generated `x-request-id` (never the client's), also logged in
  the request span; responses default to `Cache-Control: no-store` (tower-http layers).
- The API is described with OpenAPI (`utoipa`): each handler has a `#[utoipa::path]` and is
  registered with `routes!` in its module's `routes/<module>_routes.rs` (merged by `router.rs`),
  so the documented path is the served one. The API
  serves it at `/openapi.json`; `crates/server/openapi.json` is the committed copy the console
  and the SDK generate their types from (a test fails when it is stale).
- Stack: Rust, tokio, axum, sqlx (PostgreSQL 19 in Docker), validator, argon2, jsonwebtoken, oauth2,
  reqwest, lettre, askama, totp-rs, image, hmac, base64, thiserror, tracing, tower-http, moka,
  utoipa; tests use wiremock for OAuth providers and webhook receivers.
- SDK (`packages/sdk`, `@nelcota/sdk`): TypeScript client for tenant apps, no runtime
  dependencies. It keeps the session, renews it before expiry (one refresh in flight), handles
  OAuth with PKCE, magic links, MFA and sessions, and queries the database
  (`from('t').select(...).eq(...).execute()`, `rpc`) as the logged-in user. On servers,
  `createAccessTokenVerifier` verifies access tokens using cached JWKS (WebCrypto Ed25519),
  and `verifyWebhook` verifies webhooks. Types are generated from `openapi.json`. Uses
  TypeScript 7; `api:types` runs openapi-typescript with its own TypeScript 5.9 through `npx`
  (it needs the compiler API, which TypeScript 7 does not have), like the console.
- Console (`apps/console/`): React + TypeScript SPA built with Vite, TanStack Router and TanStack
  Query and shadcn/ui with Radix UI; see "Console
  structure". It talks to the API only; the API
  address is fixed at build time by `VITE_API_URL`. It logs in with the SDK (compiled from
  `packages/sdk/src` through a path alias) using the platform tenant's publishable key
  (`VITE_PLATFORM_PUBLISHABLE_KEY`). Never put a secret key or the admin token in the browser.
- Example app (`examples/react-auth/`): React + Vite app that shows every Auth flow with the SDK
  (same path alias as the console), plus the quickstart in its README. It follows the console's
  TypeScript rules; keep it working when the SDK changes.
- Deploy: one VPS with `docker-compose.prod.yml`. Caddy (`deploy/caddy/`) is the only public
  service: it serves the built console, proxies the API, and obtains TLS certificates. The API
  trusts the address Caddy appends to `X-Forwarded-For` (`CLIENT_IP_HEADER`). The `backup`
  service sends daily encrypted dumps of every database to Cloudflare R2 (`deploy/backup/`).
  Operations (first boot, platform tenant, backups, staging): `docs/deploy.md`.
- CI (`.github/workflows/ci.yml`): API (fmt, clippy, tests with Postgres and Mailpit), console and
  SDK (format, lint, generated types, tests, build), example app (format, lint, build), Docker
  images on pushes to `main`.
- Behind Cloudflare (proxied DNS records, recommended so console assets come from the edge):
  SSL/TLS mode "Full (strict)", `CLIENT_IP_HEADER=cf-connecting-ip`, and the VPS firewall allows
  ports 80/443 only from Cloudflare's IP ranges. Caching needs no rule: hashed assets are
  `immutable`, `index.html` is `no-cache` and API responses are `no-store`.

## Commands

- `docker compose up -d`: start local Postgres (port 5434) and Mailpit (SMTP 1026, UI/API
  http://localhost:8026). Copy `.env.example` to `.env` first. The integration tests need both.
- `cargo run -p server`: run the API.
- `cargo test --workspace`: run all tests.
- With disposable PostgreSQL, authenticated Valkey and Mailpit configured, run the HTTP stress
  scenarios with `cargo test --release --locked -p server --test http stress:: -- --ignored --nocapture --test-threads=1`.
- For real R2 staging transfers, set `R2_STRESS_ENDPOINT`, `R2_STRESS_BUCKET`,
  `R2_STRESS_ACCESS_KEY_ID` and `R2_STRESS_SECRET_ACCESS_KEY` in the process environment. Use a
  staging-only Object Read & Write key and a disposable local control plane. Run
  `cargo test --release --locked -p server --test http live_r2::live_storage_ramp -- --ignored --exact --nocapture`.
  Failed transfers keep their normal deletion grace period in the control plane.
- `cargo fmt --all` and `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`.
- Console, in `apps/console/`: `npm install`, `npm run dev` (http://localhost:5173, API from
  `VITE_API_URL`, default http://localhost:8080), `npm run build` (type check + bundle),
  `npm run lint`, `npm run format` / `npm run format:check` (oxfmt).
- SDK, in `packages/sdk/`: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`,
  `npm run build`.
- Example app, in `examples/react-auth/`: `npm install`, `npm run dev` (http://localhost:5174; a
  project with that site URL and its publishable key in `.env.local`), `npm run build`,
  `npm run lint`, `npm run format` / `npm run format:check`.
- After changing an endpoint or its types: `cargo run -p server --bin export-openapi` (rewrites
  `crates/server/openapi.json`), then `npm run api:types` in `apps/console/` and `packages/sdk/`.
- Local console login: create the platform tenant (slug `console`, `site_url`
  http://localhost:5173) with `POST /admin/v1/tenants`, and put its publishable key in
  `apps/console/.env.local` as `VITE_PLATFORM_PUBLISHABLE_KEY`.
- Production: copy `.env.production.example` to `.env.production`, fill it, then
  `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.

## Folder structure

Modular monolith in `crates/server/src/`: one folder per business context under `modules/`.

- Root: `main.rs`, `app_config.rs`, `app_state.rs` (composition root that holds every module's
  services), `router.rs` (maps URLs to module routes and layers; no logic), `api_doc.rs` (OpenAPI
  info, tags and security schemes), `startup/` (error, settings and state builders, HTTP server),
  `bin/export_openapi.rs`.
- `modules/<module>/`: everything one context owns, grouped in sub-packages by subject, plus its
  handlers in `routes/` (one file per endpoint, no business logic beyond request/response mapping;
  use cases live in the sub-packages), and its refusals in `rejection/<module>_rejection.rs` (an
  enum with the HTTP status and stable error code of each, converted into `ApiError`).
  - `tenants/`: `access` (TenantContext, AdminAccess, TenantAdmin), `api_keys` (issuance,
    revocation), `signing_keys` (keys, cache, rotation, access token JWTs), `database` (tenant
    pools for Auth and for the Data API, create/migrate/drop, server-wide roles), `provisioning` (creation, deletion), `settings` (site URL, tenant
    settings), `smtp` (tenant SMTP settings, host policy, senders), `platform` (console accounts,
    memberships, roles).
  - `auth/`: `user` (record, lookup, registration, account updates, listing, administration,
    metadata), `audit` (activity log events, recording, listing),
    `password`, `avatar` (profile photo processing and storage), `session` (refresh tokens,
    issuing, session listing), `login` (completion with the
    MFA step), `mfa` (TOTP codes, factors, challenges), `one_time_token`, `email` (auth emails and
    template), `rate_limiting`.
  - `oauth/`: `provider` (providers, endpoints, credentials, configured providers), `client`,
    `login` (start, completion, state), `profile` (one file per provider), `identity`
    (identities, account linking).
  - `team/`: `member` (team members, owner checks), `invitation` (invitations, their email,
    answers by the invited account).
  - `webhooks/`: `event` (event types and payloads), `endpoint` (URL policy, storage, use
    cases), `signing` (secrets, signatures), `outbox` (subscriptions cache, recorder, wake-up
    hints), `delivery` (transport and DNS guard, queue, schedule, retries, worker, delivery log,
    test send), `runtime` (what `AppState` holds).
  - `database/`: `access` (the caller's role and claims), `execution` (request transaction,
    query guard, error mapping), `schema` (introspection, cache, relationships, function
    resolution), `query` (URL and `Prefer` parsing into a `ReadQuery`), `sql` (statement
    writers), `rows` (read, write and function-call use cases), `admin` (developer session, SQL
    runner, table and policy DDL, schema overview).
- `shared/`: infrastructure with no business rules (`crypto`, `http` (generic `ApiError`, client
  IP, bearer token), JSON validation, request id and span, `database` migrators, `email` SMTP
  sender, `net` public host checks). `shared` never imports from `modules`.
- A new file goes into the sub-package of its subject; create a sub-package when a module has
  several files about one subject. Never leave loose files at a module root; `mod.rs` files only
  declare modules.
- Split a file when it has more than one reason to change: a type and its storage, two providers,
  two endpoints, a rule and its HTTP mapping.
- Dependencies point one way: `tenants → shared`, `webhooks → tenants`,
  `auth → webhooks, tenants`, `oauth → auth, webhooks, tenants`, `team → auth, tenants`,
  `database → auth (rate limits), tenants`.
  Never create a cycle; if two modules need each other, the shared piece belongs in the lower one.
- A new product of the BaaS (storage, functions) starts as a new module; split modules
  into workspace crates only when the compiler-enforced boundary is worth the extra setup.
- Migrations live in `crates/server/migrations/` (`control_plane/` and `tenant/`). Tenant
  migrations run with `search_path=auth`; `tenant_migration` first moves an old database's
  `_sqlx_migrations` from `public` to `auth`.

## Console structure

The console mirrors the API: modules per business context, shared infrastructure, one-way
dependencies. In `apps/console/src/`:

- `main.tsx`: mounts the app with its providers; nothing else.
- `app/`: composition root. `router.tsx` maps URLs to module pages (only logic: the login guard),
  `lazy-routes/` has one lazy route per page. `shell/` holds the signed-in layout: an icon rail on
  the black frame (projects, account, invitations, theme, account menu) and a rounded panel with a
  top bar (history, breadcrumbs, search) and, inside a project, a sidebar with the project
  switcher and grouped pages. A sheet holds the navigation on narrow screens. The app also contains auth and router status pages,
  the query client, and `global.css` for the light and dark themes.
- `modules/<module>/`: everything one context owns (`account`, `projects`, `overview`, `api-keys`,
  `users`, `project-settings`, `system-status`, `team`, `webhooks`, `activity`, `database`):
  - `pages/`: one file per route; composes components, no fetching or business logic.
  - `components/`: UI of the module, one component per file.
  - `queries/`: TanStack Query hooks (`use-*-query.ts`, `use-*-mutation.ts`); the only place that
    calls `api/`.
  - `api/`: one file per API call; the only place that calls `fetch`.
  - Create these sub-folders only when the module has something for them.
- `shared/`: infrastructure with no business rules: `api` (typed `apiClient` from `openapi-fetch`
  that sends the console session's token, `projectHeaders`, `dataOf`/`ensureSuccess`, generated
  `api-schema.d.ts` that is never edited by hand, base URL, `ApiError`), `auth` (the SDK client
  and `useSession`), `routing` (route params, search, and `RouterLink`), `theme` (`ConsoleTheme`
  and `useThemeMode`), and `ui` (primitives and local compositions: `PageHeader` (every page starts with
  it), `Section`, `SettingsSection`, `ErrorAlert`, `LoadError`, `ConfirmButton`/`ConfirmDialog`,
  `StepDialog`, `CopyButton`, `CopyableValue`, `UrlField`, `JsonField`, `SavedNote`,
  `FlashNotice`, `StatCard`, `Notice`, `StatusBadge`, `PendingButton`, `TextField`,
  `SwitchField`, `SelectField`, `SearchField`, `SegmentedControl`, `ChoiceCards`, `DataList`,
  `CodeBlock`, `EmptyState`, and the Veloz-style `SummarySentence`, `ResourceCard`,
  `ActivityItem`, `LevelBadge`, `LiveIndicator`, `FieldFacets`, `ChartLegend`,
  `AnimatedNumber`), `lib` (including `format-number` and `format-relative` for pt-BR figures). Layout is plain Tailwind markup over the primitives: no
  stack, text or wrapper components that restyle primitives. `shared` never imports from `modules` or `app`.
- Use shadcn/ui primitives from `shared/ui/primitives/` and semantic tokens defined in
  `app/global.css`. See `DESIGN.md` for the visual and interaction conventions.
- Icons are Lucide (stroke 1.5) everywhere; only brand logos compile at build time through
  `unplugin-icons` (`@iconify-json/logos`).
- Dependencies point one way: `app → modules → shared`. A module may use another module's
  components; never create a cycle (`import/no-cycle` enforces it).

TypeScript rules (the general rules of this file apply too: no `else`, no `!` negation, guard
clauses, no boolean variables for conditions, max 3 parameters, small files and functions):

- `strict` mode; never `any`, never the non-null assertion `x!`; handle `null` with a guard.
- `=== false` instead of `!value`; `===`/`!==` only.
- No ternaries to pick JSX or values; use guard returns or a small component.
- Named exports only (no `export default`, except tool configs like `vite.config.ts`).
- Exported functions and components declare their return type (`JSX.Element`, `Promise<void>`).
- File names in kebab-case; components in PascalCase; hooks start with `use`.
- Validate data from outside the app before using it (URL search params, storage); API responses
  are typed from the OpenAPI document.
- Destructive actions (revoke, delete, ban) go through `ConfirmButton`.
- Call the API only through `apiClient` (typed paths and bodies), inside a module's `api/` file.
- `npm run format`, `npm run lint` (oxlint, `.oxlintrc.json`) and `npm run build` (type check)
  must pass with zero warnings before finishing.

## UI design

- Every clickable element shows the pointer (hand) cursor on hover; keep a global CSS rule that
  guarantees it and never remove it. Disabled elements use `cursor: not-allowed`, loading ones `cursor: progress`.
- Every interactive element needs visible hover, press (a subtle scale-down, respecting reduced motion)
  and keyboard focus (`:focus-visible` ring) states.

### No AI-style design

Never ship the generic look of AI-generated UI. Every element must earn its place.

- Copy: say it once, short and concrete. No tips ("Dica: …"), no sentences explaining what
  the UI already shows, no repeating the same information in the description and in the field.
- No decoration without a job: no illustrations, gradients, glows, uppercase labels (except the
  sidebar and menu group labels of `DESIGN.md`), badges or
  emojis for flavor.
- One control per action: no button that duplicates a link or a clickable area next to it.
- Show only what the user needs to decide or act: no extra readouts (zoom percentages, counters)
  or extra variants (three preview sizes when the app uses two).
- Follow the shared UI components and theme tokens (`Section`, `Table`, `Button`) instead of
  inventing new styles for one screen. Records are rows (`Table`, `List`), not one card each.

## Tests

- Framework: the built-in `cargo test` (`#[test]`, `#[tokio::test]`).
- Write unit tests for every rule with branches (validation, crypto, token rotation) and integration
  tests for every HTTP endpoint. Run the whole suite before finishing any task.

## Control flow

- Never use `else` or `else if` in `if` expressions. Anywhere.
- `let ... else` is allowed, and preferred, as a guard clause: `let Some(user) = user else { return Err(...); };`.
- Never use `if` as a value-producing expression to emulate a ternary (`let x = if a { b } else { c };`).
  Use `match`, a guard clause, or a small function.
- Never use the `!` negation operator. Use explicit comparisons:
  `is_active == false`, `items.is_empty() == false`. Macros (`format!`, `vec!`) are fine.
- `!=` is allowed (it is a comparison, not a negation): `tenant_id != expected_id`.
- Always use braces in `if` blocks (Rust requires them). The body goes on its own line.
- Leave a blank line after each `if` block, before the next statement. No blank line right after `{`.
- Use guard clauses with early returns (`?`, `let ... else`) at the start of functions.
- When there are many branches, prefer `match`, a lookup map, or a trait.

## Local variables

- At the start of a function, bind the values you will use to local `let` variables.
- Never repeat the same field/method chain; read it once and reuse the binding.
- Avoid long chains (`a.b.c.d`); break them into named locals.
- Do not create variables for boolean conditions; keep conditions inline in the `if`.

```rust
// Bad
fn delivery_campaign_title(delivery: &Delivery) -> Result<&str, DeliveryError> {
    if delivery.application.campaign.is_none() {
        return Err(DeliveryError::CampaignNotFound(delivery.id));
    }

    Ok(&delivery.application.campaign.as_ref().unwrap().title)
}

// Good
fn delivery_campaign_title(delivery: &Delivery) -> Result<&str, DeliveryError> {
    let application = &delivery.application;
    let Some(campaign) = &application.campaign else {
        return Err(DeliveryError::CampaignNotFound(delivery.id));
    };

    Ok(&campaign.title)
}
```

## Strict Rust

- `#![forbid(unsafe_code)]` in every crate. Never use `unsafe`.
- Never use `unwrap()`, `expect()`, `panic!`, `todo!` or `unimplemented!` outside tests. Return a `Result`.
- Never use `as` for numeric casts. Use `TryFrom`/`try_into()` and handle the error, or `From` when lossless.
- Never index with `[]` where it can panic (`vec[i]`, `&s[a..b]`). Use `.get()` and handle `None`.
- Always type public function signatures explicitly. No `impl Trait` in public return types unless needed.

## Defensive checks (always)

Validate inputs at the start of every public function:

- Missing values: `Option` is matched with `let ... else`, never unwrapped.
- Empty values: `text.trim().is_empty()`, `items.is_empty()`.
- Numbers: bounds (`n < MIN_VALUE`, `n > MAX_VALUE`), zero when used as a divisor, `f64::is_finite`.
- Slice index and length bounds (off-by-one).
- Fail fast: return early with a clear, specific error. Never fail silently.

## Errors and async

- Never ignore a `Result` (`let _ = ...`, `.ok()` to discard). Handle it or propagate it with `?`.
- Handle an error only if you can do something meaningful; otherwise propagate it.
- Use specific error enums per module (`thiserror`), not strings or `Box<dyn Error>` in library code.
- Every future must be awaited or explicitly spawned and supervised.
- Never block inside async code (CPU-heavy work like Argon2 goes to `spawn_blocking`).

## Validation at boundaries

Validate data that comes from outside the code: HTTP requests, environment variables, database rows from
tenant databases, external services (OAuth providers).

- Deserialize with `serde` into a dedicated request struct and validate it with `validator` (`#[validate]`).
- One struct per shape; never write the same shape twice.
- Prefer newtypes that can only be built valid (`EmailAddress::parse`) for values used across modules.

Before writing validation, ask yourself:

- Yes: data crosses a boundary (external, untrusted, or unknown shape).
- No: data is internal and already typed; the type system already guarantees it.

## Backend never trusts the client

Treat everything the client sends as untrusted.

- Validate every request (body, path, query, headers).
- Always resolve the tenant from the API key and the user from the verified token, on every request.
- Never trust tenant IDs, user IDs, roles or claims sent in the body. Recompute on the server.
- Compare secrets (API keys, token hashes) in constant time.

## Simplicity first

- Always pick the simplest solution that solves the current problem.
- No over-engineering: no traits, generics, factories, or layers "for the future" (YAGNI).
- Add a trait only when there are two implementations, or a second one is close.
- Do not add dependencies when a few lines of code solve it.

## Libraries before hand-rolling

Before building something non-trivial, ask yourself:

- "Am I going to build this by hand? Or is there a well-known crate that already does it?"

Never hand-roll cryptography, password hashing, JWT handling, OAuth flows, or SMTP.

Rules:

- Trivial logic (a few lines): write it by hand.
- Solved, non-trivial problems: use a well-known, maintained crate.
- Always ask me before adding any new dependency, explaining why it is worth it.

## Small types and SRP

- Every struct, module and function has exactly one responsibility.
- If you need "and" to describe what it does, split it.
- Files: aim for under ~150 lines. Functions: aim for under ~20 lines.
- Max 3 parameters per function; group more into a struct.
- Max 2 levels of nesting inside a function.

## Naming

- Names must reveal intent; no abbreviations (`customer_address`, not `cust_addr`).
- Types and traits: PascalCase nouns (`TokenIssuer`). Functions and variables: snake_case; functions are verbs.
- Booleans: `is_`/`has_`/`can_`/`should_` prefix.
- Constants: UPPER_SNAKE_CASE. No magic numbers or strings.
- No generic names: `data`, `info`, `temp`, `manager`, `helper`, `utils`.

## File organization

- One main type per file.
- File names in snake_case (Rust requires it): `token_issuer.rs`.

## Comments

- Comment the _why_, never the _what_.
- Never leave commented-out code; git keeps the history.

## Logging

- Use `tracing`; never leave `println!`/`dbg!` used for debugging.
- Never log passwords, tokens, API keys, secrets, or personal data (emails included).

## Tooling

After every change, before considering the task done:

1. Format: `cargo fmt --all`
2. Lint: `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`
3. Test: `cargo test --workspace`
4. Fix every warning. Never add `#[allow(...)]` to silence a lint. Project-wide lints live in
   `[workspace.lints]` in the root `Cargo.toml`.

Follow the `rust-best-practices` skill (`.claude/skills/rust-best-practices`) for Rust idioms.
Where it conflicts with this file, this file wins (e.g. no `else`, explicit `== false`, comments
only for the why, `mod.rs` files only declare modules).

Style: rustfmt defaults (4-space indentation).

## Self-review before finishing

**Is it secure?**

- Is every external input validated (requests, env vars, provider responses)?
- Is the tenant always derived from the API key, never from the client?
- Can anything be injected (SQL outside `sqlx` bind parameters, headers, paths)?
- Are secrets encrypted at rest, compared in constant time, and kept out of logs?
- Do errors avoid leaking internal details (and avoid revealing whether an email exists)?

**Is it well done?**

- Does it follow every rule in this file (no `else`, no `!`, no `unwrap`, guard clauses, locals at the top)?
- Are all edge cases covered (empty, bounds, expired, revoked, reused tokens)?
- Is this the simplest solution? Did I hand-roll something a crate already solves?
- Does every type and function have a single responsibility? Are the names clear?

If any answer is "no", fix it before finishing.

## Git: English only

- Everything in git is in English: commit messages, branch names, PR titles, PR descriptions, and review comments.
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Imperative mood, subject ≤ 72 chars.
- Branch names: `feat/short-description`, `fix/short-description`.
- Never commit or push unless I explicitly ask.
- Never commit secrets. `.env` files must be in `.gitignore`; commit only a `.env.example` without real values.
