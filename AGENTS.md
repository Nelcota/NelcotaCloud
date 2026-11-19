# Project Guidelines

## Communication

- Always talk to me in Portuguese (Brazil).
- Code, comments, identifiers, and everything in git are in English.

## Repository layout

Read the [architecture map](docs/architecture.md) for ownership, dependencies and runtime
invariants, and the [README](README.md) for local development and OpenAPI generation.

- Keep routes focused on HTTP validation and response mapping. Compose dependencies at the
  boundary and pass only what each use case needs. Prefer a shared repository for a domain
  invariant used by multiple workflows.
- Group Rust files by business context and subject. Keep `mod.rs` files for declarations,
  and keep the dependency graph acyclic. `shared` contains infrastructure and never imports
  business modules.
- In the console, dependencies flow from `app` to `modules` to `shared`. Pages compose features,
  query hooks call API files, and shared code never imports a feature or `app`.
- Use the existing console UI primitives, Manrope and Solar Linear icons. Keep generated
  OpenAPI types in sync through the generators.
- Preserve public HTTP and SDK contracts when moving or renaming internals.

## TypeScript

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
- No decoration without a job: no icons inside tinted circles, no gradients or glows, no
  uppercase tracked eyebrow labels ("PRÉ-VISUALIZAÇÃO"), no badges or emojis for flavor.
- One control per action: no button that duplicates a link or a clickable area next to it.
- Show only what the user needs to decide or act: no extra readouts (zoom percentages, counters)
  or extra variants (three preview sizes when the app uses two).
- Follow the existing components and tokens (`SettingsSection`, `Button`, borders, radii) instead
  of inventing new styles for one screen.

## Tests

- Framework: the built-in `cargo test` (`#[test]`, `#[tokio::test]`).
- Write unit tests for every rule with branches (validation, crypto, token rotation) and integration
  tests for every HTTP endpoint. Run the whole suite before finishing any task.

## Control flow

- Never use `else`, including `else if` and `let ... else`.
- Never use `if` as a value-producing expression to emulate a ternary (`let x = if a { b } else { c };`).
  Use `match`, a guard clause, or a small function.
- Never use the `!` negation operator. Use explicit comparisons:
  `is_active == false`, `items.is_empty() == false`. Macros (`format!`, `vec!`) are fine.
- `!=` is allowed (it is a comparison, not a negation): `tenant_id != expected_id`.
- Always use braces in `if` blocks (Rust requires them). The body goes on its own line.
- Leave a blank line after each `if` block, before the next statement. No blank line right after `{`.
- Use guard clauses with early returns at the start of functions. Use `?` to propagate failures
  and `match` when a branch needs its own control flow.
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
    let campaign = application
        .campaign
        .as_ref()
        .ok_or(DeliveryError::CampaignNotFound(delivery.id))?;

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

- Missing values: handle `Option` with `match` or propagate absence with `?`.
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

Follow the `rust-best-practices` skill (`.agents/skills/rust-best-practices` or `.claude/skills/rust-best-practices`) for Rust idioms.
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
