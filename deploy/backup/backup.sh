#!/usr/bin/env bash
# Dumps every NelcotaCloud database, encrypts and uploads them, then waits for the next run.
# A failed run is logged and retried at the next interval; the loop never stops on its own.
set -euo pipefail

# shellcheck source=backup-env.sh
. /usr/local/bin/backup-env.sh

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

log() {
    echo "$(date --utc +%Y-%m-%dT%H:%M:%SZ) backup: $*"
}

run_backup() {
    local snapshot work_dir database
    snapshot="$(date --utc +%Y%m%dT%H%M%SZ)"
    work_dir="$(mktemp --directory)"
    trap 'rm -rf "${work_dir}"' RETURN

    # Roles and their password hashes, needed to restore onto a fresh server.
    pg_dumpall --globals-only --no-role-passwords >"${work_dir}/globals.sql"

    for database in $(list_databases); do
        pg_dump --format=custom --dbname="${database}" --file="${work_dir}/${database}.dump"
    done

    rclone copy --quiet "${work_dir}" "backup:${snapshot}"
    log "uploaded snapshot ${snapshot} ($(find "${work_dir}" -name '*.dump' | wc -l) databases)"

    rclone delete --quiet --min-age "${BACKUP_RETENTION_DAYS}d" backup:
    rclone rmdirs --quiet --leave-root backup:
}

if [ "${1:-}" = "--once" ]; then
    run_backup
    exit 0
fi

while true; do
    if run_backup; then
        log "next run in ${BACKUP_INTERVAL_SECONDS}s"
    else
        log "FAILED; retrying in ${BACKUP_INTERVAL_SECONDS}s"
    fi

    sleep "${BACKUP_INTERVAL_SECONDS}"
done
