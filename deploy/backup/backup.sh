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
            rclone purge "backup:${snapshot}" || return 1
        fi
    done <<<"${directories}"
}

# Read the inventory or identity in the exact snapshot imported by pg_dump. The exporting
# session must stay open until pg_dump completes. Only the control-plane call emits rows.
dump_database() (
    local work_dir="$1" database="$2" expected_id="${3:-}"
    local session_pid reader writer token row actual_id=''
    coproc SNAPSHOT_SESSION {
        exec psql --no-psqlrc --set=ON_ERROR_STOP=1 --quiet --tuples-only --no-align \
            --field-separator='|' --dbname="${database}"
    }
    session_pid="${SNAPSHOT_SESSION_PID}"
    trap 'kill "${session_pid}" 2>/dev/null || true; wait "${session_pid}" 2>/dev/null || true' EXIT
    exec {reader}<&"${SNAPSHOT_SESSION[0]}" {writer}>&"${SNAPSHOT_SESSION[1]}" || return 1

    {
        printf '%s\n' 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;' 'SELECT pg_export_snapshot();'
        if [[ -z "${expected_id}" ]]; then
            printf '%s\n' "SELECT 'tenant_' || slug, id FROM public.tenants ORDER BY slug;"
        else
            printf '%s\n' 'SELECT tenant_id FROM auth.tenant_identity WHERE singleton;'
        fi

        printf '%s\n' '\echo inventory-end'
    } >&"${writer}" || return 1
    IFS= read -r -u "${reader}" token || return 1

    while IFS= read -r -u "${reader}" row && [[ "${row}" != 'inventory-end' ]]; do
        if [[ -z "${expected_id}" ]]; then
            printf '%s\n' "${row}" || return 1
        else
            actual_id="${row}"
        fi
    done

    if [[ "${row}" != 'inventory-end' || -z "${token}" ]]; then
        return 1
    fi

    if [[ -n "${expected_id}" && "${actual_id}" != "${expected_id}" ]]; then
        log "tenant identity does not match for ${database}" >&2
        return 1
    fi

    pg_dump --format=custom --snapshot="${token}" --lock-wait-timeout=30s \
        --dbname="${database}" --file="${work_dir}/${database}.dump" || return 1
    printf '%s\n' 'COMMIT;' '\q' >&"${writer}" || return 1
    wait "${session_pid}" || return 1
    trap - EXIT
)

# This function is called in a conditional by the scheduler. Every fallible step is checked
# explicitly because Bash suppresses errexit throughout that invocation.
run_backup() (
    local snapshot work_dir tenants database tenant_id
    work_dir="$(mktemp --directory "${TMPDIR:-/tmp}/nelcota-backup.XXXXXXXXXX")" || return 1
    trap 'rm -rf -- "${work_dir}"' EXIT
    snapshot="$(date --utc +%Y%m%dT%H%M%SZ)-${work_dir##*.}" || return 1
    pg_dumpall --globals-only --no-role-passwords >"${work_dir}/globals.sql" || return 1
    tenants="$(dump_database "${work_dir}" nelcota_control)" || return 1

    while IFS='|' read -r database tenant_id; do
        if [[ -z "${database}" ]]; then
            continue
        fi

        if [[ ! "${database}" =~ ${TENANT_DATABASE_PATTERN} || -z "${tenant_id}" ]]; then
            log "invalid project inventory in control plane"
            return 1
        fi

        dump_database "${work_dir}" "${database}" "${tenant_id}" || return 1
    done <<<"${tenants}"

    snapshot_checksums "${work_dir}" >"${work_dir}/${SNAPSHOT_MANIFEST}" || return 1
    rclone copy --exclude "/${SNAPSHOT_MANIFEST}" "${work_dir}" "backup:${snapshot}" || return 1
    rclone copyto "${work_dir}/${SNAPSHOT_MANIFEST}" "backup:${snapshot}/${SNAPSHOT_MANIFEST}" || return 1
    log "published snapshot ${snapshot}"
    prune_snapshots || return 1
)

if [ "${1:-}" = "--once" ]; then
    run_backup
    exit 0
fi

while true; do
    delay="${BACKUP_INTERVAL_SECONDS}"
    if run_backup; then
        log "next run in ${delay}s"
    else
        if (( delay > 300 )); then
            delay=300
        fi

        log "FAILED; retrying in ${delay}s"
    fi

    sleep "${delay}"
done
