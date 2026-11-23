#!/bin/sh
# Renders the PgBouncer configuration from the environment and starts it.
#
# TLS: PGBOUNCER_TLS_CERT_FILE / PGBOUNCER_TLS_KEY_FILE point at a mounted certificate for the
# public database host (clients may then use sslmode=verify-full). Without them a self-signed
# certificate is created once and kept in the volume: traffic is encrypted, but clients cannot
# verify the server (sslmode=require).
set -eu

: "${POOLER_AUTH_PASSWORD:?set POOLER_AUTH_PASSWORD (the same value the API has)}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
TLS_DIR=/var/lib/pgbouncer/tls
TLS_CERT_FILE="${PGBOUNCER_TLS_CERT_FILE:-$TLS_DIR/server.crt}"
TLS_KEY_FILE="${PGBOUNCER_TLS_KEY_FILE:-$TLS_DIR/server.key}"

case "$POOLER_AUTH_PASSWORD" in
  *[!0-9a-fA-F]*) echo "POOLER_AUTH_PASSWORD must be hex" >&2; exit 1 ;;
esac

if [ -z "${PGBOUNCER_TLS_CERT_FILE:-}" ] && [ ! -s "$TLS_CERT_FILE" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -subj "/CN=${DATABASE_PUBLIC_HOST:-nelcota-pgbouncer}" \
    -keyout "$TLS_KEY_FILE" -out "$TLS_CERT_FILE" 2>/dev/null
  chmod 0600 "$TLS_KEY_FILE"
fi

sed -e "s|\${POSTGRES_HOST}|$POSTGRES_HOST|" \
    -e "s|\${POSTGRES_PORT}|$POSTGRES_PORT|" \
    -e "s|\${TLS_CERT_FILE}|$TLS_CERT_FILE|" \
    -e "s|\${TLS_KEY_FILE}|$TLS_KEY_FILE|" \
    /etc/pgbouncer/pgbouncer.ini.template > /etc/pgbouncer/pgbouncer.ini

# The lookup role's own password, in the format PgBouncer reads; the hex value needs no quoting.
umask 077
printf '"nelcota_pgbouncer" "%s"\n' "$POOLER_AUTH_PASSWORD" > /etc/pgbouncer/userlist.txt

pgbouncer /etc/pgbouncer/pgbouncer.ini &
pgbouncer_pid=$!
trap 'kill -TERM "$pgbouncer_pid" 2>/dev/null' TERM INT

# Checks every 5 seconds that PgBouncer still runs (the container stops with it) and sends it
# SIGHUP every 12 hours so a renewed certificate is read.
seconds_since_reload=0
while kill -0 "$pgbouncer_pid" 2>/dev/null; do
  sleep 5 &
  wait $! || true
  seconds_since_reload=$((seconds_since_reload + 5))
  if [ "$seconds_since_reload" -ge 43200 ]; then
    kill -HUP "$pgbouncer_pid" 2>/dev/null || true
    seconds_since_reload=0
  fi
done

wait "$pgbouncer_pid"
