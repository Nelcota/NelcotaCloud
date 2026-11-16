#!/usr/bin/env bash
# Restores every database of one snapshot, replacing the current ones.
#   restore.sh            lists the snapshots
#   restore.sh SNAPSHOT   restores it (stop the api service first: docker compose stop api)
set -euo pipefail

# shellcheck source=backup-env.sh
. /usr/local/bin/backup-env.sh

snapshot="${1:-}"

if [ -z "${snapshot}" ]; then
    echo "Snapshots (newest last):"
    rclone lsf --dirs-only backup: | sed 's#/$##' | sort
    exit 0
fi

work_dir="$(mktemp --directory)"
trap 'rm -rf "${work_dir}"' EXIT
rclone copy --quiet "backup:${snapshot}" "${work_dir}"

if [ -z "$(find "${work_dir}" -name '*.dump' -print -quit)" ]; then
    echo "snapshot ${snapshot} not found or empty" >&2
    exit 1
fi

for dump in "${work_dir}"/*.dump; do
    database="$(basename "${dump}" .dump)"
    echo "restoring ${database}"
    dropdb --if-exists --force "${database}"
    createdb "${database}"
    pg_restore --no-owner --exit-on-error --dbname="${database}" "${dump}"
done

echo "restored snapshot ${snapshot}"
