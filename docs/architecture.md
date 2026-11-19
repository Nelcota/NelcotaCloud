# NelcotaCloud Architecture

| Area | Location | Responsibility |
| --- | --- | --- |
| Rust service | [crates/server](../crates/server/) | Auth, Database, the control plane, and webhook delivery |
| Console | [apps/console](../apps/console/) | Project and account administration |
| TypeScript SDK | [packages/sdk](../packages/sdk/) | Auth and Data API client for application developers |
| HTTP verification | [crates/server/tests/http](../crates/server/tests/http/) | Integration tests grouped by domain, with shared fixtures |
| Operations | [deploy](../deploy/) | Caddy, service images, and backups |

In platform and console code, a **project** is what a team manages, a **tenant** is the
isolation boundary, an **account** belongs to the console, and a **user** belongs to a
project's Auth database. A **membership** connects a console account to a project.

## Runtime and data boundaries

NelcotaCloud provides multitenant Auth and exposes each project's PostgreSQL database
through a REST API governed by row-level security.

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
  the checked password hash locked (`FOR SHARE`) while it stores the new session.
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
  deletes (owners only) their projects. Deletion commits a durable intent and removes the active
  project before dropping the database. The intent reserves the slug until cleanup finishes, and
  maintenance retries interrupted deletions. Owners invite people by email
  (`tenant_invitations`, accepted by the console account with that verified email, joining as
  member) and remove members; `tenant_members.account_email` is refreshed when the account lists
  its projects. Owners change roles (`PATCH .../members/{account_id}`) and anyone leaves
  (`DELETE .../membership`). An owner hands the project over in one transaction
  (`POST .../ownership-transfer`); all lock the project's memberships so it always keeps an owner
  (`last_owner`), and promotion respects the 10-owned-projects limit (`owned_project_limit`).
  Ownership is never handed out by invitation: invite as member, then promote.
- User administration: the list filters by `status` (`unverified`, `banned`) and sorts by
  creation or by last login (`order=last_sign_in`, with its own `l`-prefixed cursor, never-logged-in
  users last); each user carries `last_sign_in_at` (kept on `users` by a trigger on new refresh
  token families), `has_password` and the linked `providers`. `GET .../users/export` returns the
  list's filters and order as CSV (up to 100,000 rows, formula-safe cells, the name from
  `user_metadata.name` or `full_name`). A user's detail reads their active sessions and their linked
  identities (provider and date only); `POST .../users/{id}/verification-email` resends the
  verification link to an unverified, unbanned user under the public per-address email limit.
  The console shows them at `/projects/$projectId/users/$userId`.
- User metadata (`auth/user/user_metadata*`): two JSON objects on `users`. `user_metadata`
  (up to 16 KiB, no NUL characters) is replaced by the user (`PATCH /auth/v1/user`, which refuses `app_metadata`)
  or an admin; `app_metadata` (up to 4 KiB) only by admins (`PATCH /auth/v1/admin/users/{id}`)
  and is copied into access tokens as the `app_metadata` claim, so it reaches apps on the next
  login or refresh. Both changes report `user.updated`. The console edits them on the user page.
- Activity log (`tenants/audit` records, `auth/audit` reads): the tenant's `audit_events` (90
  days visible in every read, with expired rows removed by background batches). It records logins
  (with method), refused, throttled and wrong-MFA-code logins (the typed email only when it is a
  valid address: anything else may be a mistyped password; linked to the account it names, for
  the log only), reused refresh tokens, the account's own life (signup, email verified, logout,
  emailed magic and reset links, MFA on or off, self-deletion), admin actions on users, and
  changes to the project itself (API keys, settings, email templates, OAuth providers, team,
  schema and migrations) with who did them (`AdminActor`: secret key or console account). Every
  event keeps the client IP, user agent and request id (`RequestOrigin`) and, for project
  changes, a small `details` object chosen by the route (never a body or a secret). Recording
  lives in `tenants` so routes of `tenants`, `team`, `oauth` and `database` can use it; a failed
  insert is logged, never failing the request. `GET /auth/v1/admin/audit-events` pages by
  `before` (event id) and filters by `kind` (each kind is a list of actions) and by `days` or a
  `from`/`to` range; the console shows it at `/projects/$projectId/activity`, on each user's
  page and on the overview, with a detail panel per event.
- Blocked addresses (`tenants/ip_blocks`): the tenant's `blocked_addresses` (an IP or a CIDR
  range, at most /16 for IPv4 and /48 for IPv6, with an optional note and expiry; up to 500).
  `GET/POST /auth/v1/admin/blocked-addresses` and `DELETE …/{block_id}` manage them; login,
  signup, emailed-link requests, magic-link and MFA steps, OAuth code exchange and refresh refuse
  a blocked client IP first with 403 `address_blocked`. Blocking and unblocking are project
  events in the activity log. The console manages the list in Settings and blocks from the
  activity log (suspicious IPs, event panel).
- Activity webhook (`webhooks/audit_relay`): endpoints may subscribe to `audit.event`. Each
  audit insert records a pending entry in the same transaction. The relay claims pending
  entries with row locks, moves them to the outbox, and removes those entries atomically.
  IDs may commit out of order. Relay rounds run independently of delivery and process up to
  four tenants in parallel. Pending entries expire after one hour.
- Captcha (`tenants/captcha`): a project may require Cloudflare Turnstile (`PUT/DELETE
  /auth/v1/admin/captcha`; the secret is checked with Cloudflare, then encrypted). Signup,
  password login and the emailed-link requests then need `captcha_token`, checked after the rate
  limit; Cloudflare unreachable refuses with 503 (fails closed). Apps read the site key at
  `GET /auth/v1/captcha`. The console does not render the widget, so never enable it on the
  platform tenant. Tests point `CAPTCHA_VERIFY_URL` at a fake.
- Usage (`auth/usage`): `GET /auth/v1/admin/usage` counts monthly active users (UTC calendar
  months) from the refresh tokens created in the month, so logins and renewals by any method
  count; the console overview shows this month and last month. The usage index covers the token
  date range and user ID. The console opts into a 30-second snapshot with `?cached=true`,
  shared within an API instance by project and UTC month. `GET /auth/v1/admin/usage/daily?days=`
  (1 to 90, default 30) counts
  logins (`logged_in` audit events, so as far back as the activity log keeps them) and sign-ups
  (users still present) per UTC day, every day listed, oldest first.
- Auth users: the console lists users through `GET /auth/v1/admin/users/page` and passes
  `next_cursor` back as `before` with the same filters. It fetches the overall count separately
  and shares it with the navigation. `GET /auth/v1/admin/users` serves offset pages and exact counts.
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
  (`state.webhooks.recorder(tenant_id)`) and record with `user_events`. After the commit, the API's
  hint publisher marks the tenant due in `webhook_schedule`. The dedicated worker polls the
  control-plane schedule and opens tenant databases for due work. It acquires 30-second leases in
  a short transaction and releases the database connection before sending HTTP. Replicas can
  send concurrently across endpoints, with one live lease per endpoint. Results update a
  delivery only while its token still owns the lease. An expired lease makes that delivery
  eligible again with the same `webhook-id`. Receivers deduplicate by that ID because a process
  can exit after sending and before saving the result. Failed sends retry with jitter for about
  28 hours. Deleting or disabling an endpoint updates its schedule in the same control-plane
  transaction. The worker gives up its unleased deliveries immediately on the next look and
  checks back after any active lease expires. The schedule also wakes for retention (7 days).
  A sweep on startup and every 5 minutes recovers lost hints, including tenants scheduled for
  future retries or retention. Test events
  and resends are rate limited per project. Receivers must be https on public addresses,
  checked at save and again by the client's DNS resolver on every request (no redirects, no
  proxy); `WEBHOOK_ALLOW_PRIVATE_HOSTS=true` lifts it for local development only.

  The project queue summary reads only delivery metadata from the authorized tenant database.
  It caps individual counts at 10,000 with a truncation flag, uses indexed due-time ordering to
  find the exact oldest overdue delivery, and excludes future retries and live leases from the
  overdue count. The console shares one query between the overview and Webhooks page. Each worker
  publishes its own heartbeat, last successful schedule read, and last recorded delivery batch to
  the control plane, independently of network sends. Operators read those times through the
  private worker-health endpoint. Worker heartbeats expire after 40 seconds for availability and
  are pruned after 24 hours.
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
  response. Table and column creation in the console index new referencing columns. Writes
  need a filter for update/delete and refuse `limit`/`offset`, and inserts are
  grouped by the columns each row sets (one statement per group, in order) so left-out columns
  take their defaults. Publishable-key requests are rate limited per project and client IP,
  secret-key and console ones per project (`modules/database/access/rate_limit_quotas.rs`). Filters, order or pages named
  after an embed missing from `select` are refused (they would be ignored); `not.or`/`not.and`
  negate groups; `in.()` matches nothing. Errors map SQLSTATE to stable codes (`permission_denied`,
  `unique_violation`, ...); the console's SQL editor (and its schema overview, which never runs
  as the superuser) passes Postgres's message on and keeps at most 1000 rows / 4 MiB of values;
  a last query that found no rows shows its own empty header (prepared again, never re-run).
- Project database migrations (`/database/v1/migrations`) serialize applies with a transaction
  advisory lock on the project database. The tenant-bound admin route checks the version and SQL
  checksum, runs the script as the developer role, and stores the history entry in the same
  transaction. The migration session alone can append to the private ledger. PostgreSQL runs the
  script inside an atomic function call to prevent it from ending the transaction or changing
  roles. A schema change triggers the usual Data API cache invalidation.
- Rate limits (`governor`, in memory, single instance; quotas owned by the feature that uses them) on
  signup, login (per email from one network, per email, per client IP), the Argon2 work a client
  causes across projects, MFA codes, auth emails (per address, per recipient across projects,
  per project), token and code redemption, OAuth start, invitations, project creation, profile
  and avatar changes, and Data API requests, plus a global per-client-IP limit on every request
  (`startup/request_limit.rs`). The server assembles the limiters in `rate_limits.rs`;
  auth email and invitation traffic shares the existing delivery limits, and OAuth code exchanges
  share the token redemption limit. Keys are tenant + email and tenant + client IP (IPv6 per /64). Refusals
  are 429 with `Retry-After`. Argon2 and avatar decoding run behind semaphores (busy: 503);
  request bodies time out after 30 s and requests after 60 s. Behind Cloudflare set
  `CLIENT_IP_HEADER=cf-connecting-ip`.
- Signing keys (5 minutes), SMTP senders and webhook subscriptions are cached with `moka`,
  and tenant pools while in use
  (`TenantPoolRegistry`): concurrent misses share one load. Caches whose entries a change must
  drop use a per-tenant `CacheGeneration` advanced after the change commits (entries keyed by
  it, or checked against a snapshot taken before loading), so a load in flight never puts a
  stale value back and one tenant's change never empties the others' entries. API keys use one
  indexed lookup of active keys per request. Tenant deletion cascades to the keys, and revocation
  applies across instances as soon as it commits.
- Team changes (role, removal, invitation, cancellation) check that the actor is still an owner
  inside the statement or transaction that locks the project's memberships (in account order,
  as project deletion does); OAuth linking and magic links read the user `FOR UPDATE` before
  deciding on it.
- Project Cache (`/cache/v1`) starts disabled. The control plane owns feature state, generation
  and scoped credentials. The API verifies the credential against Postgres on every request,
  then stores expiring JSON in private Valkey under the verified project ID and generation.
  Cache settings and credentials are removed when tenant deletion retires access.
  See [project cache](project-cache.md).
- Project Storage (`/storage/v1`) stores a scoped catalog in the control plane and uploads file
  bytes directly to a private R2 bucket using short-lived signatures. The catalog queues cleanup
  in the same transaction as object, bucket, or project deletion. See [project storage](project-storage.md).
- Every response carries a server-generated `x-request-id` (never the client's), also logged in
  the request span; responses default to `Cache-Control: no-store` (tower-http layers).
- The API supervises the schedule publisher and maintenance tasks. The dedicated worker stops
  claiming after a shutdown signal and gives in-flight deliveries up to 20 seconds to finish.
  `/health` is public liveness.
  `/ready` probes the control plane from inside the API container and is blocked at the public proxy.
  The container gives HTTP requests time to finish within their 60-second deadline. Debug logs
  expose schedule age, lease claim duration, and control-plane pool occupancy.
- The API is described with OpenAPI (`utoipa`): each handler has a `#[utoipa::path]` and is
  registered with `routes!` in its module's `routes/<module>_routes.rs` (merged by `router.rs`),
  so the documented path is the served one. The API
  serves it at `/openapi.json`; `crates/server/openapi.json` is the committed copy the console
  and the SDK generate their types from (a test fails when it is stale).
- Stack: Rust, tokio, axum, sqlx (PostgreSQL 18 in Docker), validator, argon2, jsonwebtoken, oauth-providers,
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
  Query, Tailwind CSS and shadcn/ui; see "Console structure". It talks to the API only; the API
  address is fixed at build time by `VITE_API_URL`. It logs in with the SDK (compiled from
  `packages/sdk/src` through a path alias) using the platform tenant's publishable key
  (`VITE_PLATFORM_PUBLISHABLE_KEY`). Google and GitHub buttons show only for the providers in
  `VITE_CONSOLE_OAUTH_PROVIDERS`, which must also be configured on the platform tenant; they
  return to `/auth/callback`. `VITE_SUPPORT_EMAIL` (required by the production compose file)
  adds a support address to the login, MFA and error pages. The login keeps its step in the
  URL (`?etapa=`); emailed login links land on `/auth/magic-link`. Team invitations link to
  `/login?convite=1&projeto=<name>`, which names the project as text only. Never put a secret
  key or the admin token in the browser.
- Deploy: one VPS with `docker-compose.prod.yml`. Caddy (`deploy/caddy/`) is the only public
  service: it serves the built console, proxies the API, and obtains TLS certificates. The API
  trusts the address Caddy appends to `X-Forwarded-For` (`CLIENT_IP_HEADER`). The `backup`
  service sends daily encrypted dumps of every database to Cloudflare R2 (`deploy/backup/`). It
  uploads the inventory and checksum manifest last so interrupted uploads are excluded from restore.
  Operations (first boot, platform tenant, backups, staging): `docs/deploy.md`.
- CI (`.github/workflows/ci.yml`): API (fmt, clippy, tests with Postgres and Mailpit), console and
  SDK (format, lint, generated types, tests, build and package consumer), module boundaries,
  backup verification, and Docker images on pushes to `main`.
- Behind Cloudflare (proxied DNS records, recommended so console assets come from the edge):
  SSL/TLS mode "Full (strict)", `CLIENT_IP_HEADER=cf-connecting-ip`, and the VPS firewall allows
  ports 80/443 only from Cloudflare's IP ranges. Caching needs no rule: hashed assets are
  `immutable`, `index.html` is `no-cache` and API responses are `no-store`.

## Rust server

Modular monolith in `crates/server/src/`: one folder per business context under `modules/`.

- The root contains `main.rs`, `app_config.rs`, `app_state.rs` (composition root),
  `rate_limits.rs` (limiter assembly), `router.rs` (route and middleware wiring), `api_doc.rs` (OpenAPI
  info, tags and security schemes), `startup/` (error, settings and state builders, HTTP server),
  `bin/export_openapi.rs`.
- `modules/<module>/`: everything one context owns, grouped in sub-packages by subject, plus its
  handlers in `routes/` (one file per endpoint, no business logic beyond request/response mapping;
  use cases live in the sub-packages), and its refusals in `rejection/<module>_rejection.rs` (an
  enum with the HTTP status and stable error code of each, converted into `ApiError`).
  - `tenants/`: `access` (TenantContext, TenantAdmin), `api_keys` (issuance,
    revocation), `signing_keys` (keys, cache, rotation, access token JWTs), `postgres` (tenant
    pools, migrations and roles), `provisioning` (creation and deletion), `settings` (site URL
    and tenant settings), `captcha`, `smtp` (tenant SMTP settings, host policy and senders),
    `audit` (recording the activity log, from any module), `ip_blocks` (blocked addresses), and
    `platform` (console accounts,
    memberships, roles). The membership repository owns the ordered lock and ownership cap
    shared by project deletion and team workflows.
  - `auth/`: `user` (record, lookup, registration, account updates, listing, administration,
    metadata), `audit` (activity log listing, summary, export, login events),
    `password`, `avatar` (profile photo processing and storage), `session` (refresh tokens,
    issuing, session listing), `login` (completion with the
    MFA step), `mfa` (TOTP codes, factors, challenges), `one_time_token`, `email` (auth emails and
    template), `rate_limiting` (Auth quotas and login limits), and `usage` (monthly active users).
  - `oauth/`: `provider` (providers, endpoints, credentials, configured providers), `client`,
    `login` (start, completion, state), `profile` (one file per provider), `identity`
    (identities, account linking).
  - `team/`: `member` (team members, owner checks), `invitation` (invitations, their email,
    answers by the invited account).
  - `webhooks/`: `audit_relay` (the `audit.event` feed), `event` (event types and payloads), `endpoint` (URL policy, storage, use
    cases), `signing` (secrets, signatures), `outbox` (subscriptions cache, recorder, wake-up
    hints), `scheduling` (durable wake-up times), `delivery` (transport and DNS guard, queue, retries, worker, delivery log,
    test send), `runtime` (what `AppState` holds).
  - `storage/`: private buckets, object catalog and quota, project and user access, R2 signatures,
    and durable cleanup for expired uploads and deleted objects.
  - `cache/`: scoped credential access and quota, JSON entry validation and the Valkey connection,
    project settings and credentials, and HTTP routes.
  - `database/`: `access` (the caller's role and claims), `execution` (request transaction,
    query guard, error mapping), `schema` (introspection, cache, relationships, function
    resolution), `query` (URL and `Prefer` parsing into `ReadQuery` and `WriteQuery`), `sql` (statement
    writers), `rows` (read, write and function-call use cases), `admin` (developer session, SQL
    runner, table and policy DDL, schema overview). HTTP handlers live in `routes/data_api`
    for `/rest/v1` and `routes/admin` for `/database/v1`. Both receive scoped database
    session dependencies assembled by `AppState`.
- `shared/`: infrastructure with no business rules (`crypto`, `http` (generic `ApiError`, client
  IP, bearer token), JSON validation, request id and span, `database` migrators, `email` SMTP
  sender, `net` public host checks, reusable rate limiters). `shared` never imports from `modules`.
- A new file goes into the sub-package of its subject; create a sub-package when a module has
  several files about one subject. Never leave loose files at a module root; `mod.rs` files only
  declare modules.
- Split a file when it has more than one reason to change: a type and its storage, two providers,
  two endpoints, a rule and its HTTP mapping.
- Dependencies point one way: `tenants → shared`, `cache → tenants`, `webhooks → tenants`,
  `storage → auth, tenants`,
  `auth → webhooks, tenants`, `oauth → auth, webhooks, tenants`, `team → auth, tenants`,
  `database → tenants`.
  Never create a cycle; if two modules need each other, the shared piece belongs in the lower one.
- A new product of the BaaS starts as a new module; split modules
  into workspace crates only when the compiler-enforced boundary is worth the extra setup.
- Migrations live in `crates/server/migrations/` (`control_plane/` and `tenant/`). Tenant
  migrations run with `search_path=auth`; `tenant_migration` first moves an old database's
  `_sqlx_migrations` from `public` to `auth`.

## Console structure

The console mirrors the API: modules per business context, shared infrastructure, one-way
dependencies. In `apps/console/src/`:

- `main.tsx`: mounts the app with its providers; nothing else.
- `app/`: composition root. `router.tsx` maps URLs to module pages (only logic: the login guard),
  `lazy-routes/` for page and authenticated layout imports, `shell/` the signed-in layout (project
  sidebar from `project-sections.ts`, top bar with project switcher and account menu, a sheet on
  small screens with the same sidebar content; the theme toggle is in the account menu), `auth-layout.tsx` login and email-link
  pages, `status-screen.tsx` with `route-error-page.tsx` and `not-found-page.tsx` (router defaults), `query-client.ts`, `global.css`
  (theme tokens: graphite neutrals, one blue accent; dark by default, light via the account menu;
  font Manrope).
- `modules/<module>/`: everything one context owns (`account`, `projects`, `overview`, `api-keys`,
  `users`, `project-settings`, `system-status`, `team`, `webhooks`, `activity`, `database`):
  - `pages/`: one file per route; composes components, no fetching or business logic.
  - `components/`: UI of the module, one component per file.
  - `queries/`: TanStack Query hooks (`use-*-query.ts`, `use-*-mutation.ts`); the only place that
    calls `api/`.
  - `api/`: one file per API call; the only place that calls `fetch`.
  - Create these sub-folders only when the module has something for them. Use a feature folder
    when several UI components, queries and API calls belong to the same workflow.
    `project-settings` uses `general`, `captcha`, `oauth-providers`, `smtp` and `email-templates`;
    the email page composes the last two. `database/sql-editor` owns the SQL editor, while
    `database` owns the shared grid and query keys. Feature-level validation and transformations
    live in `model/` when several components use them.
- `shared/`: infrastructure with no business rules: `api` (typed `apiClient` from `openapi-fetch`
  that sends the console session's token, `projectHeaders`, `dataOf`/`ensureSuccess`, a
  type-only re-export of the SDK's generated schema, base URL, `ApiError`), `auth` (the SDK client
  and `useSession`), `routing` (route params and search), `theme` (`useTheme`), `ui` (shadcn components, plus
  `FormField`, `SwitchField`, `ErrorAlert`, `ConfirmButton`/`ConfirmDialog`, `PageHeader` (every page
  starts with it), `SettingsSection`, `EmptyState`, `Skeleton`, `CopyButton`, `SavedNote`; add shadcn ones with
  `npx shadcn@latest add`, then move any exported `cva` variants to their own file and swap its
  `lucide-react` icons for Solar), `lib`.
- Icons: Solar Linear only, imported per icon (`import Key from '~icons/solar/key-linear'`),
  compiled at build time by `unplugin-icons` with `icon-compiler.ts`; type `IconComponent`. `shared` never imports from
  `modules` or `app`.
- Dependencies point one way: `app → modules → shared`. A module may use another module's
  components; never create a cycle (`import/no-cycle` enforces it).

## SDK structure

- `src/index.ts` defines the package exports. `client/create-client.ts` wires the client.
- `auth/` owns the authentication facade and auth types. `auth/session/` handles session state,
  storage, renewal and cross-tab coordination. `auth/oauth/` owns the OAuth client and PKCE.
- `database/` builds Data API requests and reads the current access token through a narrow
  session interface. `http/` provides transport, while `tokens/` and `webhooks/` verify
  access tokens and incoming webhooks for application servers.
- The OpenAPI generator writes `packages/sdk/src/generated/api-schema.d.ts`. The console
  re-exports these types from its `shared/api/api-schema.d.ts` and compiles the SDK from source
  through its `@nelcota/sdk` alias.
