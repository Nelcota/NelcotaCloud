#!/usr/bin/env bash
set -euo pipefail

. "$(dirname "${BASH_SOURCE[0]}")/snapshot-manifest.sh"
. "$(dirname "${BASH_SOURCE[0]}")/snapshot-retention.sh"

date() {
    [[ "$*" == '--utc --date=30 days ago +%Y%m%dT%H%M%S' ]] || return 1
    printf '%s\n' '20261101T120000'
}

rclone() {
    case "$*" in
        'lsf --dirs-only --max-depth 1 backup:')
            printf '%s\n' '20261030T120000012345678Z/' '20261101T115959Z/' \
                '20261101T120000Z/' '20261126T120000012345678Z/' 'unrelated/' '../invalid/'
            ;;
        *) printf '%s\n' "$*" ;;
    esac
}

expected=$(printf '%s\n' \
    'delete --include /complete.sha256 backup:20261030T120000012345678Z' \
    'purge backup:20261030T120000012345678Z' \
    'delete --include /complete.sha256 backup:20261101T115959Z' \
    'purge backup:20261101T115959Z')
[[ "$(prune_snapshots 30)" == "${expected}" ]]

if prune_snapshots 0 2>/dev/null; then
    echo "a nonpositive retention period was accepted" >&2
    exit 1
fi
