#!/usr/bin/env bash
# Backs up the whole PostgreSQL cluster at a single recoverable point.
# A failed run is logged and retried at the next interval; the loop never stops on its own.
set -euo pipefail

# shellcheck source=backup-env.sh
. /usr/local/bin/backup-env.sh
# shellcheck source=snapshot-manifest.sh
. /usr/local/bin/snapshot-manifest.sh
# shellcheck source=storage-snapshot.sh
. /usr/local/bin/storage-snapshot.sh

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

log() {
    echo "$(date --utc +%Y-%m-%dT%H:%M:%SZ) backup: $*"
}

run_backup() (
    snapshot="$(date --utc +%Y%m%dT%H%M%S%NZ)" || return
    work_dir="$(mktemp --directory)" || return
    trap 'rm -rf "${work_dir}"' EXIT

    # Bash ignores errexit when the caller tests this function's status.
    mkdir "${work_dir}/cluster" || return
    pg_basebackup --pgdata="${work_dir}/cluster" --checkpoint=spread --wal-method=stream \
        --manifest-checksums=SHA256 --no-password || return
    pg_verifybackup --quiet "${work_dir}/cluster" || return
    tar --create --gzip --file="${work_dir}/${CLUSTER_ARCHIVE}" \
        --directory="${work_dir}/cluster" . || return


    if [[ -n "${STORAGE_BACKUP_SOURCE_BUCKET:-}" ]]; then
        archive_storage "${work_dir}" "${snapshot}" || return
        rclone copyto --immutable "${work_dir}/storage.keys" "backup:${snapshot}/storage.keys" || return
        rclone copyto --immutable "${work_dir}/storage.location" "backup:${snapshot}/storage.location" || return
    fi

    write_snapshot_manifest "${work_dir}" || return
    rclone copyto --immutable "${work_dir}/${CLUSTER_ARCHIVE}" \
        "backup:${snapshot}/${CLUSTER_ARCHIVE}" || return
    rclone copyto --immutable \
        "${work_dir}/${SNAPSHOT_MANIFEST}" "backup:${snapshot}/${SNAPSHOT_MANIFEST}" || return
    log "uploaded verified cluster snapshot ${snapshot}" || return

    rclone delete --min-age "${BACKUP_RETENTION_DAYS}d" backup: || return
    rclone rmdirs --leave-root backup:
)

run_scheduled_backup() {
    if run_backup; then
        log "next run in ${BACKUP_INTERVAL_SECONDS}s"
        return
    fi

    log "FAILED; retrying in ${BACKUP_INTERVAL_SECONDS}s"
}

if [ "${1:-}" = "--once" ]; then
    run_backup
    exit 0
fi

while true; do
    run_scheduled_backup
    sleep "${BACKUP_INTERVAL_SECONDS}"
done
