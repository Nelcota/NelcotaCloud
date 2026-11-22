#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=backup-env.sh
. "$(dirname -- "${BASH_SOURCE[0]}")/backup-env.sh"

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! "${BACKUP_INTERVAL_SECONDS}" =~ ^[1-9][0-9]*$ || ! "${BACKUP_RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]]; then
    echo "backup interval and retention must be positive integers" >&2
    exit 1
fi

log() {
    printf '%s backup: %s\n' "$(date --utc +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

prune_snapshots() {
    local snapshot directories timestamp cutoff age
    cutoff="$(date --utc --date="${BACKUP_RETENTION_DAYS} days ago" +%s)" || return 1
    directories="$(rclone lsf --dirs-only backup:)" || return 1

    while IFS= read -r snapshot; do
        snapshot="${snapshot%/}"

        if [[ ! "${snapshot}" =~ ${SNAPSHOT_PATTERN} ]]; then
            continue
        fi

        timestamp="${snapshot:0:4}-${snapshot:4:2}-${snapshot:6:2} ${snapshot:9:2}:${snapshot:11:2}:${snapshot:13:2}"
        age="$(date --utc --date="${timestamp}" +%s)" || return 1

        if (( age < cutoff )); then
            rclone purge --quiet "backup:${snapshot}" || return 1
        fi
    done <<<"${directories}"
}

# This function is called in a conditional by the scheduler. Every fallible step is checked
# explicitly because Bash suppresses errexit throughout that invocation.
run_backup() (
    local snapshot work_dir databases database
    work_dir="$(mktemp --directory "${TMPDIR:-/tmp}/nelcota-backup.XXXXXXXXXX")" || return 1
    trap 'rm -rf -- "${work_dir}"' EXIT
    snapshot="$(date --utc +%Y%m%dT%H%M%SZ)-${work_dir##*.}" || return 1
    databases="$(list_databases)" || return 1

    if ! grep --fixed-strings --line-regexp --quiet nelcota_control <<<"${databases}"; then
        log "control-plane database is missing"
        return 1
    fi

    pg_dumpall --globals-only --no-role-passwords >"${work_dir}/globals.sql" || return 1

    while IFS= read -r database; do
        if ! is_project_database "${database}"; then
            log "unexpected project database name"
            return 1
        fi

        pg_dump --format=custom --dbname="${database}" --file="${work_dir}/${database}.dump" || return 1
    done <<<"${databases}"

    snapshot_checksums "${work_dir}" >"${work_dir}/${SNAPSHOT_MANIFEST}" || return 1
    rclone copy --quiet --exclude "/${SNAPSHOT_MANIFEST}" "${work_dir}" "backup:${snapshot}" || return 1
    rclone copyto --quiet "${work_dir}/${SNAPSHOT_MANIFEST}" "backup:${snapshot}/${SNAPSHOT_MANIFEST}" || return 1
    log "published snapshot ${snapshot}"
    prune_snapshots || return 1
)

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
