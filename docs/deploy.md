# Deploying NelcotaCloud

One VPS runs everything with `docker-compose.prod.yml`: Postgres, the API, the webhook worker,
Caddy (console, API proxy and TLS) and the backup job. A staging environment is the same stack
on its own domains.

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

Run [Deploy NelcotaCloud](../.github/workflows/deploy.yml) from `main` in GitHub Actions. It
deploys the selected commit to staging, checks the API's `/health` response, and then deploys
the same commit to production. A failed migration blocks the Compose update for that environment
and a failed staging job blocks production.

Create the `staging` and `production` GitHub environments and set these values on each one.

| Name | Kind | Value |
| --- | --- | --- |
| `NELCOTA_API_URL` | Variable | HTTPS origin for this stack, matching `API_DOMAIN` on the VPS |
| `NELCOTA_SECRET_KEY` | Secret | Secret API key for this environment's NelcotaCloud project |
| `NELCOTA_SSH_TARGET` | Variable | SSH destination as `user@host`, reachable by the GitHub runner |
| `NELCOTA_SSH_PORT` | Variable | SSH port, defaults to `22` |
| `NELCOTA_SSH_KNOWN_HOSTS` | Variable | Verified server host key in OpenSSH `known_hosts` format |
| `NELCOTA_SSH_PRIVATE_KEY` | Secret | Deployment SSH private key usable in batch mode |
| `NELCOTA_COMPOSE_ENV_FILE` | Variable | Absolute path to the existing `.env.staging` or `.env.production` on the VPS |
| `NELCOTA_COMPOSE_PROJECT` | Variable | Existing project name from `docker compose ls --all`, including any name set with `-p` |

The SSH account needs access to the environment file, Docker, and a Compose plugin with
`up --wait` support. The runner sends the selected commit as a source archive over SSH.
Compose keeps the existing project name and reads its environment file on the VPS.

Complete [first boot](#2-first-boot) for both stacks before using the workflow. Roll out the
version that serves the migration API before adding the first SQL file to [`migrations/`](../migrations/).
In production, the API applies the control-plane and existing
tenant migrations before it becomes ready. The dedicated worker connects with its restricted
runtime roles after the API is ready. Set `POSTGRES_RUNTIME_PASSWORD` to a separate 64-character
hex secret in both environment files before rolling out this release.

The deployment stops the previous webhook workers before the new API prepares tenant
databases. Do the same for a manual rollout: only one relay implementation may run during the
upgrade from the legacy audit cursor. Resume delivery with the new workers after the API is
ready. Keep the last version of workers running on the pending-event queue during rollbacks.
When upgrading a custom deployment from the release with embedded delivery, replace
every old API process before starting the first dedicated worker. Use the same master key for
the API and worker so they can share encrypted signing secrets.

### Webhook queue health

`WEBHOOK_WORKER_REPLICAS` defaults to 2 in production Compose. It controls both the service
scale and the number the internal diagnosis expects. Replicas on the same VPS share the
database and recover a failed process after its delivery leases expire. Place replicas on a
separate host with a reachable, redundant PostgreSQL service to cover a VPS outage.

The platform administrator can read the worker status from inside the stack. The endpoint is
blocked by the public proxy. The probe sends the configured proxy IP header and the admin token
from inside the API container.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api bash -ec '
  exec 3<>/dev/tcp/127.0.0.1/8080
  printf "GET /ops/webhooks/worker-health HTTP/1.0\r\n%s: 127.0.0.1\r\nX-Admin-Token: %s\r\n\r\n" \
    "$CLIENT_IP_HEADER" "$ADMIN_TOKEN" >&3
  cat <&3
'
```

`operational` means all expected replicas have sent a heartbeat in the last 40 seconds.
`reduced_redundancy` means some are missing. `no_recent_heartbeat` means the control plane is
reachable and no replica has reported recently. HTTP 503 with `unknown` means the diagnosis
could not read the control plane. An idle worker may have an empty `last_batch_at`. With a
backlog, `last_poll_at` and `last_batch_at` help distinguish a stalled process from a busy one.
For notifications, use a monitor outside the worker host to distinguish absent results from an
empty queue. Calibrate alert thresholds in staging before enabling notifications.

Deploy the API and worker before the console. The tenant migration `0017` creates a partial
index on failure time with a 2-second lock budget and a 15-second statement budget. If the
index build exceeds that budget on a large tenant, create the same index with `CREATE INDEX
CONCURRENTLY` on that tenant's `auth.webhook_deliveries` before the rollout and verify the index
is valid. Keep both applied `0017` migrations in any rollback image so SQLx can validate the
database's migration history. Use the same Compose project and PostgreSQL volume when testing
an upgrade with a queued delivery.

### PostgreSQL performance during rollout

The production Compose file preloads `pg_stat_statements`. This takes effect when PostgreSQL
restarts. The control-plane migration exposes the statistics view, which covers all databases
on the server. Read it from the private control-plane database as an operator.

```sql
SELECT datname, application_name, state, count(*) AS connections
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY datname, application_name, state
ORDER BY connections DESC;

SELECT db.datname, stats.queryid, stats.calls, stats.total_exec_time, stats.mean_exec_time
FROM pg_stat_statements AS stats
JOIN pg_database AS db ON db.oid = stats.dbid
ORDER BY stats.total_exec_time DESC
LIMIT 20;
```

Compare pool acquisition delays and HTTP p95/p99 before increasing the replica count. The
access log records request latency. SQLx logs acquisitions over 100 ms for control-plane and
project pools. Debug logs include time waiting for Data API session slots and the cache
credential pool. Keep capacity for the API, the dedicated cache pool, workers and maintenance
when budgeting PostgreSQL connections.

Production reserves 20 connection slots for the control-plane role, caps the shared
control-plane login at 40 connections and caps the tenant runtime login at 160. Each worker
uses up to three control-plane connections. The API uses its bootstrap credentials for
platform migrations and tenant database lifecycle operations, and holds at most two
provisioning slots per instance. Its ordinary queries and the dedicated worker use restricted
logins. Project authenticators are capped at five connections each and idle Data API
connections are reclaimed after five seconds.

Tenant migrations `0018` and `0019` build the refresh-token user index and the email trigram
index with a 2-second lock budget and a 15-second statement budget. For large tenants, build
the indexes concurrently in that tenant database before rolling out the server. In `psql`,
run these statements outside a transaction and verify both indexes have `indisvalid = true`.
If a concurrent build failed and left an invalid index, drop that index concurrently and
retry the build before rolling out.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA auth;
CREATE INDEX CONCURRENTLY IF NOT EXISTS refresh_tokens_user_id_idx ON auth.refresh_tokens (user_id);
SELECT format(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_trgm_idx ON auth.users USING gin (email %I.gin_trgm_ops)',
    namespace.nspname
)
FROM pg_extension AS extension
JOIN pg_namespace AS namespace ON namespace.oid = extension.extnamespace
WHERE extension.extname = 'pg_trgm'
\gexec
```

Tenant migrations `0023` through `0026` build the audit indexes under the same time budgets.
For large activity logs, create the indexes with `CREATE INDEX CONCURRENTLY` before rollout,
using the definitions for [audit search and failures](../crates/server/migrations/tenant/0023_index_audit_search_and_summary.sql),
[distinct login accounts](../crates/server/migrations/tenant/0024_index_audit_login_accounts.sql),
[failure periods](../crates/server/migrations/tenant/0025_index_audit_failure_period.sql), and
[summary counts](../crates/server/migrations/tenant/0026_index_audit_summary_counts.sql).
Verify that each index is valid before applying the migrations.

Control-plane migration `0020` covers the two tenant cascade indexes under the same time
budgets. Pre-create `oauth_authorization_states_tenant_id_idx` and
`tenant_signing_keys_tenant_id_idx` with `CREATE INDEX CONCURRENTLY` on a large control plane.

On existing project tables, run [the foreign-key index report](../scripts/missing-foreign-key-indexes.sql)
to find referencing columns that can cause repeated scans in Data API embeds. Review the
generated statements against the project's workload. The script emits plain index creation
for partitioned tables, where PostgreSQL requires a separate per-partition workflow for
concurrent builds.

### Upgrading PostgreSQL 17 to 18

The PostgreSQL 18 image stores data at `/var/lib/postgresql/18/docker` inside the mounted
volume. Existing PostgreSQL 17 files require a major upgrade. Restore a full logical dump
into a new volume so the old cluster is available for rollback. Rehearse the restore on staging
before scheduling production downtime.

1. While PostgreSQL 17 is running, stop Caddy, the API, the webhook worker, the backup service and any other
   database writers. Use the same Compose project name throughout. Capture the control plane,
   every tenant database, and the roles and grants in a single cluster dump.

   ```bash
   compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
   "${compose[@]}" stop caddy webhook-worker api backup
   umask 077
   "${compose[@]}" exec -T postgres pg_dumpall --quote-all-identifiers -U nelcota > postgres-17.sql
   ```

   For local development, stop the API and worker processes and use `compose=(docker compose)` instead
   of the production command. Skip the Compose `stop` command in the local stack.
   Continue after `pg_dumpall` succeeds. Keep the dump protected because it contains tenant
   data and database password hashes.

2. Restore into an empty volume with PostgreSQL 18. Initialize it with the source bootstrap
   superuser, `nelcota`, so role grants that name `nelcota` as the grantor can be restored.

   ```bash
   pg18_volume=nelcotacloud_postgres-data-v18
   if docker volume inspect "$pg18_volume" >/dev/null 2>&1; then
       echo "Choose a new PostgreSQL volume name" >&2
       exit 1
   fi
   docker volume create "$pg18_volume"
   docker run --rm --detach --name nelcota-pg18-restore --network none --stop-timeout 180 \
       --mount "type=volume,source=$pg18_volume,target=/var/lib/postgresql" \
       --env POSTGRES_USER=nelcota --env POSTGRES_DB=postgres \
       --env "POSTGRES_PASSWORD=$(openssl rand -hex 32)" postgres:18.7
   ```

   When `docker exec nelcota-pg18-restore pg_isready -h 127.0.0.1 -d postgres` reports
   that the server is accepting connections, restore the dump. Skip only the duplicate
   `CREATE ROLE` for the initialized user in the global roles section. Its `ALTER ROLE`
   statement restores the source attributes and password hash.

   ```bash
   (
       set -o pipefail
       awk '
           /^\\connect / { in_database = 1 }
           !in_database && $0 == "CREATE ROLE \"nelcota\";" { skipped++; next }
           { print }
           END { if (skipped != 1 || !in_database) exit 1 }
       ' postgres-17.sql | docker exec -i nelcota-pg18-restore psql -X -v ON_ERROR_STOP=1 -U nelcota -d postgres -f -
   )
   ```

   After the restore succeeds, check the databases before switching the stack over.

   ```bash
   docker exec nelcota-pg18-restore psql -X -v ON_ERROR_STOP=1 -U nelcota -d postgres -c '\l'
   docker exec nelcota-pg18-restore psql -X -v ON_ERROR_STOP=1 -U nelcota -d postgres -c 'CHECKPOINT;'
   docker stop nelcota-pg18-restore
   ```

3. Once the restore and checks succeed, switch to the updated Compose files and set
   `POSTGRES_DATA_VOLUME=nelcotacloud_postgres-data-v18` in `.env.production` or `.env`, using
   the exact volume name selected above. In production, first run
   `"${compose[@]}" up -d --build api` to start PostgreSQL and the API. Locally, run
   `docker compose up -d` and start the API process. Verify the control plane and tenant data,
   then run `"${compose[@]}" up -d --build` in production to reopen traffic.

   Keep the PostgreSQL 17 volume and the protected dump until the upgrade is accepted. To roll
   back before accepting new writes, stop the 18 stack and start the 17 stack with its original
   volume and Compose configuration.

See the [PostgreSQL upgrade documentation](https://www.postgresql.org/docs/18/upgrading.html)
and the [official Docker image notes](https://hub.docker.com/_/postgres) for details.

## 5. Backups

The backup service takes a PostgreSQL base backup with streamed WAL for the entire cluster,
verifies it with `pg_verifybackup`, encrypts the archive and uploads it to R2. The completion
marker is uploaded last. All tenant databases and the control plane recover together to the
end of that backup. Snapshots are daily by default and expire after `BACKUP_RETENTION_DAYS`
(30 days). The archive includes PostgreSQL roles and stored password verifiers. Keep the backup
encryption password, the application master key, and the applicable database credentials
available outside the VPS.

Stage a restore on a new named volume. The command rejects an existing nonempty destination,
verifies the archive, boots the recovered PostgreSQL on a private Unix socket, and checks that
every active tenant in the control plane has its database. It also supports logical snapshots
with a completion marker and rejects a logical snapshot with missing tenant databases.
Use the credentials from the physical snapshot when staging it.

```bash
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
"${compose[@]}" run --rm --entrypoint restore.sh backup

restore_volume=nelcotacloud_postgres-restored
docker volume create "$restore_volume"
"${compose[@]}" run --rm -v "${restore_volume}:/restore" --entrypoint restore.sh backup SNAPSHOT
```

After staging succeeds, stop the API and worker, stop PostgreSQL, set
`POSTGRES_DATA_VOLUME` to the verified volume in the environment file, and start the same
Compose project. Keep the original volume until the restored deployment has passed the
API, project, and worker smoke checks. For a rollback before accepting writes on the restored
volume, stop the services and select the original volume. Perform the same staging procedure
regularly on an isolated host and record elapsed recovery time.

## 6. Staging

The [project cache runbook](project-cache.md) describes the optional Valkey profile
and the staging pilot.

Run the same stack with its own `.env.staging` (other domains such as `api-staging.<domain>`,
other secrets, another R2 bucket or prefix) on a second VPS, or on the same VPS under another
Compose project and other host ports behind a shared proxy:

```bash
docker compose -p nelcota-staging -f docker-compose.prod.yml --env-file .env.staging up -d --build
```

After first boot, use the [deployment workflow](#4-updates) for staging and production.

## 7. Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
```

Every line carries the request id returned in the `x-request-id` header and, once known, the
tenant id, so a user's error report leads to its log lines.
