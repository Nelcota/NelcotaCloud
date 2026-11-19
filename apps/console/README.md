# NelcotaCloud Console

The console is a React and Vite app for managing projects. It uses the platform tenant for
console accounts and calls the Rust API for project data.

## Run locally

1. Start the API and its dependencies using the [repository setup](../../README.md).
2. Create the platform tenant with `POST /admin/v1/tenants`, following the
   [platform tenant guide](../../docs/deploy.md#3-create-the-platform-tenant-console-accounts).
   Use the slug configured by `PLATFORM_TENANT_SLUG` (usually `console`) and set
   `site_url` to `http://localhost:5173`.
3. Set `VITE_PLATFORM_PUBLISHABLE_KEY` in `apps/console/.env.local` to that tenant's
   publishable key. Set `VITE_API_URL` if your API differs from `http://localhost:8080`.
   To show Google or GitHub login, configure the provider on the platform tenant and list it in
   `VITE_CONSOLE_OAUTH_PROVIDERS` (for example `google,github`). Set `VITE_SUPPORT_EMAIL` to show a
   support address on the login, MFA and error pages.
4. From `apps/console`, run `npm ci` and `npm run dev`. Open `http://localhost:5173`.
   Locally, verification emails arrive in Mailpit at `http://localhost:8026`.

## Project layout

Routes and the signed-in shell live in `src/app`. Feature code lives in `src/modules`,
with project settings grouped by workflow and the SQL editor under `database`.
Reusable UI, session access, and the OpenAPI client live in `src/shared`.

See the [architecture map](../../docs/architecture.md#console-structure) for more detail and
the [development checks](../../README.md#checks-and-generated-types) for build commands.
