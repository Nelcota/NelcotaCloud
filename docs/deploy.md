# Deploying NelcotaCloud

One VPS runs everything with `docker-compose.prod.yml`: Postgres, the API, Caddy (console, API
proxy and TLS) and the backup job. A staging environment is the same stack on its own domains.

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

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Migrations run when the API starts: the control plane at boot, each tenant database when the
tenant is first used.

## 5. Backups

The `backup` service dumps the control plane and every `tenant_*` database daily, encrypts them
and uploads them to R2, keeping `BACKUP_RETENTION_DAYS` (30) days.

```bash
# List snapshots
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint restore.sh backup
# Restore one (replaces the current databases)
docker compose -f docker-compose.prod.yml --env-file .env.production stop api
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint restore.sh backup <snapshot>
docker compose -f docker-compose.prod.yml --env-file .env.production start api
```

`restore.sh` restores each database with its owners (a project's tables must stay owned by
`nelcota_developer`), so the server-wide `nelcota_*` roles must exist: the API creates them when
it starts, so on a new server start it once before restoring. Each project's own login role and
connect privilege are recreated by the API the first time the project is used. Restore with the
same `POSTGRES_USER` the dumps were taken with.

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
```

Every line carries the request id returned in the `x-request-id` header and, once known, the
tenant id, so a user's error report leads to its log lines.
