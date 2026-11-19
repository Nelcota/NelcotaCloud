prune_snapshots() {
    local retention_days=$1 cutoff snapshots snapshot
    local LC_ALL=C

    if [[ "${retention_days}" =~ ^[1-9][0-9]*$ ]]; then
        cutoff=$(date --utc --date="${retention_days} days ago" +%Y%m%dT%H%M%S) || return
    fi

    if [[ -z "${cutoff:-}" ]]; then
        printf '%s\n' 'BACKUP_RETENTION_DAYS must be a positive integer' >&2
        return 1
    fi

    snapshots=$(rclone lsf --dirs-only --max-depth 1 backup:) || return
    while IFS= read -r snapshot; do
        snapshot="${snapshot%/}"
        if valid_snapshot_name "${snapshot}" && [[ "${snapshot%Z}" < "${cutoff}" ]]; then
            # Hide the snapshot from restore before removing any of its data.
            rclone delete --include "/${SNAPSHOT_MANIFEST}" "backup:${snapshot}" || return
            rclone purge "backup:${snapshot}" || return
        fi
    done <<<"${snapshots}"
}
