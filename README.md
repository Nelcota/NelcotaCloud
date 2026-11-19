# NelcotaCloud

NelcotaCloud is a Rust backend for multitenant Auth, Database, and project Cache. Teams manage projects in
the React console. Applications use the HTTP API or the TypeScript SDK.

## Local development

The server build needs a C compiler and libclang for the PostgreSQL parser. On Debian or Ubuntu,
install `build-essential` and `libclang-dev`. On Windows, use the MSVC build tools and LLVM.
Set `LIBCLANG_PATH` to the directory containing `libclang.dll` if it is outside the usual search path.

1. Copy `.env.example` to `.env` and fill in the local settings.
2. Run `docker compose up -d` for PostgreSQL on port 5434, Valkey on port 6380, and Mailpit
   on ports 1026 and 8026.
3. Run `cargo run -p server` from the repository root. The API defaults to
   `http://localhost:8080`.
4. In another terminal, run `cargo run -p server -- --webhook-worker` to deliver queued webhooks.
5. Follow the [console setup](apps/console/README.md) to create the platform tenant and open
   the console.

For an existing PostgreSQL 17 volume, follow the [database upgrade procedure](docs/deploy.md#upgrading-postgresql-17-to-18)
before starting PostgreSQL 18. Use `docker compose` in place of the production Compose command
and set `POSTGRES_DATA_VOLUME` in `.env` after restoring the data.

## Checks and generated types

CI uses Rust 1.100.0, Node.js 26.13.1, and npm 12.2.3.

- Run `cargo fmt --all --check`,
  `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`, and
  `cargo test --workspace --locked` from the repository root. The integration tests need
  PostgreSQL, Mailpit, and Valkey. Set `CACHE_VALKEY_URL` using `.env.example` or export it in
  your shell. Use `cargo test -p server --test http` to run just the HTTP suite.
- In `apps/console`, run `npm ci`, `npm run format:check`, `npm run lint`, and `npm run build`.
- In `packages/sdk`, run `npm ci`, `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm test`, and `npm run build`.
- After changing the HTTP contract, run `cargo run -p server --bin export-openapi` from the
  root, then run `npm run api:types` in either the console or SDK directory. Both commands
  update the shared generated schema in `packages/sdk/src/generated/api-schema.d.ts`.

See the [architecture map](docs/architecture.md), [SDK usage](packages/sdk/README.md),
[project database migrations](docs/database-migrations.md), [project cache](docs/project-cache.md),
and [deployment guide](docs/deploy.md).
