# Project Guidelines

## Communication

- Always talk to me in Portuguese (Brazil).
- Code, comments, identifiers, and everything in git are in English.

## Project

NelcotaCloud: a Backend-as-a-Service written in Rust. The first product is multitenant Auth.

- Control plane database: tenants, API key hashes, JWT signing keys, OAuth configs, pending OAuth
  authorizations.
- One Postgres database per tenant (`tenant_<slug>`): users, identities, refresh and one-time tokens.
  Its URL is derived from the slug and the current `TENANT_DATABASE_BASE_URL`, never stored.
- Provisioning holds a per-slug advisory lock in the registration transaction; a database without a
  tenant row is an orphan that the next provisioning of the slug recreates.
- Tenant secrets (signing keys, OAuth client secrets, PKCE verifiers) are encrypted with AES-GCM,
  each bound to a context (tenant, record) as associated data.
- Access tokens: short-lived EdDSA JWTs signed with the tenant's active key, public keys as JWKS.
  Refresh tokens: opaque, rotated on every use, stored only as SHA-256 hashes, grouped in families.
- Ending sessions writes markers checked when a refresh token is used (`revoked_token_families`,
  `users.sessions_invalidated_at`), so successors created by a concurrent refresh are refused too.
- Concurrency: paths that change a user lock its `users` row before its token rows (never the
  reverse), expiries are computed with the database clock (`now() + interval`), and login keeps
  the checked password hash locked (`FOR SHARE`) while it stores the new session.
- Each tenant has a required `site_url`: email links point to it and OAuth only redirects under it.
- Email (verification, password reset) is sent via SMTP with lettre, in the background.
- OAuth (Google, GitHub) uses each tenant's own OAuth app, PKCE and a one-time `state`. The callback
  returns a short-lived one-time code to the app, never tokens in the URL; the app redeems it with
  its own PKCE verifier (`code_challenge` at `/authorize`, `code_verifier` at `/oauth/token`).
  Provider endpoints are injectable (`build_app_state_with_endpoints`) so tests use a fake provider.
- Account linking by verified email refuses a second identity of the same provider, and taking over
  an unverified account drops its password and ends its sessions. A new signup for an unverified
  email takes the account over (latest signup wins until someone verifies the inbox).
- Tenant settings (`GET/PATCH /auth/v1/admin/settings`, secret key): name, `site_url`,
  `require_email_verification` (default true: password login and refresh need a verified email,
  and signup answers the same for new and existing emails).
- Routes that only touch tenant configuration use `ApiKeyTenant` (no tenant database needed);
  routes on tenant data use `TenantContext`.
- Rate limits (`governor`, in memory, single instance) on signup, login, auth emails and OAuth start,
  per tenant + email and per tenant + client IP (IPv6 per /64). Behind Cloudflare set
  `CLIENT_IP_HEADER=cf-connecting-ip`.
- Signing keys are cached per tenant for 5 minutes (`SigningKeyCache`).
- Stack: Rust, tokio, axum, sqlx (PostgreSQL 17 in Docker), validator, argon2, jsonwebtoken, oauth2,
  reqwest, lettre, thiserror, tracing.
- Console (`apps/console/`): React + TypeScript SPA built with Vite, TanStack Router and TanStack
  Query, Tailwind CSS and shadcn/ui; see "Console structure". It talks to the API only; the API
  address is fixed at build time by `VITE_API_URL`. Never put a secret key or the admin token in
  the browser.
- Deploy: one VPS with `docker-compose.prod.yml`. Caddy (`deploy/caddy/`) is the only public
  service: it serves the built console, proxies the API, and obtains TLS certificates. The API
  trusts the address Caddy appends to `X-Forwarded-For` (`CLIENT_IP_HEADER`).

## Commands

- `docker compose up -d`: start local Postgres (port 5434) and Mailpit (SMTP 1026, UI/API
  http://localhost:8026). Copy `.env.example` to `.env` first. The integration tests need both.
- `cargo run -p server`: run the API.
- `cargo test --workspace`: run all tests.
- `cargo fmt --all` and `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`.
- Console, in `apps/console/`: `npm install`, `npm run dev` (http://localhost:5173, API from
  `VITE_API_URL`, default http://localhost:8080), `npm run build` (type check + bundle), `npm run lint`.
- Production: copy `.env.production.example` to `.env.production`, fill it, then
  `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.

## Folder structure

Modular monolith in `crates/server/src/`: one folder per business context under `modules/`.

- Root: `main.rs`, `app_config.rs`, `app_state.rs` (composition root that holds every module's
  services), `router.rs` (maps URLs to module routes; no logic), `startup/` (error, settings and
  state builders, HTTP server).
- `modules/<module>/`: everything one context owns, grouped in sub-packages by subject, plus its
  handlers in `routes/` (one file per endpoint, no business logic beyond request/response mapping).
  - `tenants/`: `access` (TenantContext, AdminAccess), `api_keys`, `signing_keys`, `database`
    (tenant pools, create/migrate/drop), `provisioning`, `settings` (site URL, tenant settings).
  - `auth/`: `user` (record, lookup, registration, account updates), `password`, `session`
    (JWT, refresh tokens, issuing), `one_time_token`, `email` (auth emails), `rate_limiting`.
  - `oauth/`: `provider` (providers, endpoints, credentials), `client`, `login` (start, completion,
    state), `profile` (one file per provider), `identity` (identities, account linking).
- `shared/`: infrastructure with no business rules (`crypto`, `http` errors and JSON validation,
  `database` migrators, `email` SMTP sender). `shared` never imports from `modules`.
- A new file goes into the sub-package of its subject; create a sub-package when a module has
  several files about one subject. Never leave loose files at a module root; `mod.rs` files only
  declare modules.
- Split a file when it has more than one reason to change: a type and its storage, two providers,
  two endpoints, a rule and its HTTP mapping.
- Dependencies point one way: `tenants → shared`, `auth → tenants`, `oauth → auth, tenants`.
  Never create a cycle; if two modules need each other, the shared piece belongs in the lower one.
- A new product of the BaaS (storage, database, functions) starts as a new module; split modules
  into workspace crates only when the compiler-enforced boundary is worth the extra setup.
- Migrations live in `crates/server/migrations/` (`control_plane/` and `tenant/`).

## Console structure

The console mirrors the API: modules per business context, shared infrastructure, one-way
dependencies. In `apps/console/src/`:

- `main.tsx`: mounts the app with its providers; nothing else.
- `app/`: composition root. `router.tsx` maps URLs to module pages (no logic), `root-layout.tsx`
  is the shell, `query-client.ts` the shared cache, `global.css` the global styles.
- `modules/<module>/`: everything one context owns (e.g. `projects`, `users`, `oauth-providers`):
  - `pages/`: one file per route; composes components, no fetching or business logic.
  - `components/`: UI of the module, one component per file.
  - `queries/`: TanStack Query hooks (`use-*-query.ts`, `use-*-mutation.ts`); the only place that
    calls `api/`.
  - `api/`: one file per API call; the only place that calls `fetch`.
  - Create these sub-folders only when the module has something for them.
- `shared/`: infrastructure with no business rules: `api` (base URL, `ApiError`), `ui` (shadcn
  components; add new ones with `npx shadcn@latest add`), `lib`. `shared` never imports from
  `modules` or `app`.
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
- Validate API responses before using them, like any data crossing a boundary.
- `npm run lint` (oxlint, config in `.oxlintrc.json`) and `npm run build` (type check) must pass
  with zero warnings before finishing.

## UI design

- Every clickable element shows the pointer (hand) cursor on hover; keep a global CSS rule that
  guarantees it and never remove it. Disabled elements use `cursor: not-allowed`, loading ones `cursor: progress`.
- Every interactive element needs visible hover, press (a subtle scale-down, respecting reduced motion)
  and keyboard focus (`:focus-visible` ring) states.

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
