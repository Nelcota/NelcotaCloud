# Deploying NelcotaCloud

One VPS runs everything with `docker-compose.prod.yml`. It includes Postgres, the API, the
webhook worker, Caddy (console, API proxy and TLS) and the backup job. A staging environment
uses the same stack on its own domains.

## 1. Prerequisites

- A VPS with Docker and the Compose plugin, ports 80 and 443 open.
- Two DNS records pointing to it: `api.<domain>` and `console.<domain>`.
- An SMTP provider for the platform's emails.
- A Cloudflare R2 bucket for backups and an R2 API token with Object Read & Write on that bucket
  only.

Behind Cloudflare's proxy (orange cloud), set SSL/TLS to **Full (strict)**,
`CLIENT_IP_HEADER=cf-connecting-ip`, and allow ports 80/443 only from
[Cloudflare's IP ranges](https://www.cloudflare.com/ips/); otherwise clients could fake their IP.
Docker publishes ports through its own iptables chains, ahead of `ufw`: put those rules in the
`DOCKER-USER` chain (or the provider's network firewall), or they do not apply to Caddy.

## 2. First boot

```bash
git clone git@github.com:Nelcota/NelcotaCloud.git && cd NelcotaCloud
cp .env.production.example .env.production   # fill every value; generate secrets with openssl rand -hex 32
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Keep `MASTER_KEY_HEX` and `BACKUP_ENCRYPTION_PASSWORD` in a password manager outside the VPS:
without the first, tenant secrets cannot be decrypted; without the second, backups cannot be
restored.

### Project Cache

To offer [Project Cache](project-cache.md), run a password-protected Valkey instance on a private
network that the API container can reach. Set `CACHE_VALKEY_URL` in `.env.production` to an
authenticated URL such as `redis://:password@valkey.internal:6379`. Percent-encode reserved
characters in the password. Restrict access to Valkey's port to the private network, as the
`redis://` connection is unencrypted.

After changing the URL, recreate the API container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

### Direct Postgres connections

Projects can connect to their own database directly (Prisma, Drizzle, `psql`) through PgBouncer,
in transaction mode with TLS. Each project gets the role `nelcota_c_<slug>`, which logs in only to
its own database and acts as its developer (like the console's SQL editor). Its password is
generated in the console (Banco de dados › Conectar) or with `nelcota db reset-password`, and is
shown once.

1. Create a DNS record for the database host, for example `db.example.com`, pointing at the
   VPS. Behind Cloudflare it must be **DNS only** (grey cloud): Cloudflare does not proxy this
   port.
2. In `.env.production`, set `DATABASE_PUBLIC_HOST`, `DATABASE_PUBLIC_PORT` (6543 by default) and
   `POOLER_AUTH_PASSWORD` (`openssl rand -hex 32`). The API creates the `nelcota_pgbouncer` role
   and the `pgbouncer.user_lookup` function with that password; the function only answers for
   `nelcota_c_*` roles.
3. Start the stack with the profile, and open the port in the firewall:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile direct-connections up -d --build
```

Without a certificate, PgBouncer creates a self-signed one: traffic is encrypted, but clients
cannot verify the server (`sslmode=require`, the default the console shows). To let clients use
`sslmode=verify-full`, mount a certificate for `DATABASE_PUBLIC_HOST` into the `pgbouncer`
service (a compose override), set `PGBOUNCER_TLS_CERT_FILE` and `PGBOUNCER_TLS_KEY_FILE` to the
paths inside the container, and `DATABASE_PUBLIC_SSL_MODE=verify-full`. PgBouncer reloads every 12
hours, so a renewed certificate is picked up.

Each project may hold 10 server connections (the role's `CONNECTION LIMIT` and PgBouncer's
`max_db_connections`), and statements stop after 60 seconds by default. Prisma needs
`&pgbouncer=true` in the URL. A direct connection role can open the server's `postgres`
maintenance database, where it has no privilege; every project database and the control plane
refuse it.

## 3. Create the platform tenant (console accounts)

Console users are users of a regular tenant, named by `PLATFORM_TENANT_SLUG` (default `console`).
Create it once, with the console's address as its site URL:

```bash
curl -X POST https://api.<domain>/admin/v1/tenants \
  -H "x-admin-token: $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"slug":"console","name":"NelcotaCloud Console","site_url":"https://console.<domain>"}'
```

Put the returned `publishable_key` in `PLATFORM_PUBLISHABLE_KEY` (keep the `secret_key` safe;
it manages the console tenant itself) and rebuild the console:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build caddy
```

## 4. Updates

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Before upgrading a deployment that predates the restricted runtime roles, add a separate
`DATABASE_RUNTIME_PASSWORD` to the production environment with `openssl rand -hex 32`.
The API uses the administration credential for provisioning and migrations. Its request pools
and the webhook worker use restricted roles. On startup the API migrates the control plane
before its readiness check can pass. Compose waits for that check before starting Caddy and
the worker. The API prepares each existing project database on demand and during its rolling
maintenance scan. A project database with a failed migration is retried independently. The
worker only connects to a project after its schema and runtime grants are ready.

For multi-replica upgrades or rollbacks between releases with different storage catalog locks,
stop all running API replicas before starting replacements. Storage writers must use the same
lock while enforcing project quotas.

### Postgres major upgrades

A new Postgres major cannot read the previous one's files, so each major has its own volume
(`postgres-data-19` for Postgres 19) and the data moves with `pg_dumpall`. The previous volume is
never touched, so going back is checking out the previous commit and starting it again.

To go from Postgres 17 to 19, run these **before** `git pull`, while the old stack still runs:

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
# 1. Stop everything that writes, then dump every database, role and grant of the old server.
$C stop api webhook-worker backup
$C exec -T postgres pg_dumpall -U nelcota > nelcota-pg17.sql
tail -n 3 nelcota-pg17.sql   # must end with "PostgreSQL database cluster dump complete"
```

Then update and restore into the new, empty Postgres 19:

```bash
git pull
$C up -d postgres
$C exec -T postgres psql -U nelcota -d postgres -q -v ON_ERROR_STOP=0 < nelcota-pg17.sql
# Expected: only 'role "nelcota" already exists' and 'database "nelcota_control" already exists'.
$C exec -T postgres psql -U nelcota -d nelcota_control -Atc "select count(*) from tenants"
$C up -d --build
```

Sign in to the console and open a project before deleting anything. The dump holds password
hashes and encrypted secrets: keep it only until the upgrade is checked, then delete it and the
old volume (`docker volume rm <project>_postgres-data`). The backup image follows the server's
major version (`deploy/backup/Dockerfile`), since `pg_dump` must not be older than the server.

## 5. Backups

The `backup` service dumps the control plane and every project registered in its snapshot daily,
encrypts the archives and uploads them to R2. Each project dump must match the project UUID from
that inventory. A missing database or a project that has yet to receive its identity migration
causes the run to fail and retry within five minutes. The job publishes the checksum manifest
after every dump has uploaded and keeps complete snapshot directories for `BACKUP_RETENTION_DAYS`
(30) days. Each database has its own consistent snapshot. Project writes across separate
databases can be captured at different times.

```bash
# List snapshots
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint restore.sh backup
# Restore one (replaces the current databases)
docker compose -f docker-compose.prod.yml --env-file .env.production stop api webhook-worker backup
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint restore.sh backup <snapshot>
docker compose -f docker-compose.prod.yml --env-file .env.production start api webhook-worker backup
```

`restore.sh` verifies the manifest and restores into temporary databases. It checks that every
project in the restored control plane has a dump with the expected identity before replacing
any database name. The
renames commit together. All database clients must be disconnected during the rename. Allow
enough disk space for the original databases, the restored copies and the downloaded archives.
Older snapshots without a manifest still go through the staging restore and inventory check.

Restore with the original `POSTGRES_USER`. On a fresh cluster, start and stop the API before
restoring so the shared roles referenced in the archives exist. Restore clears each project's
preparation marker so that the API reapplies its grants and authenticator role on the target
cluster.

Rehearse a restore on staging every few months; an untested backup is not a backup.

## 6. Staging

Run the same stack with its own `.env.staging` (other domains such as `api-staging.<domain>`,
other secrets, another R2 bucket or prefix) on a second VPS, or on the same VPS under another
Compose project and other host ports behind a shared proxy:

```bash
docker compose -p nelcota-staging -f docker-compose.prod.yml --env-file .env.staging up -d --build
```

Deploy to staging first, run through signup, login, OAuth and a project in the console, then
deploy the same commit to production.

## 7. Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f webhook-worker
```

Every line carries the request id returned in the `x-request-id` header and, once known, the
tenant id, so a user's error report leads to its log lines.
