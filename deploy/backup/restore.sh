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

# Tenant databases grant to the request roles (nelcota_anon, ...) and their public schema
# belongs to nelcota_developer. The API creates these roles when it starts (and each project's
# own login role, with its connect privilege, when the project is first used), so on a new
# server start the API once before restoring.
missing_roles="$(psql --no-psqlrc --tuples-only --no-align --dbname=postgres --command     "SELECT count(*) FROM unnest(ARRAY['nelcota_anon', 'nelcota_authenticated', 'nelcota_service', 'nelcota_developer']) AS role_name WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)")"

if [ "${missing_roles}" != "0" ]; then
    echo "the nelcota_* roles are missing: start the api once, stop it, then restore" >&2
    exit 1
fi

for dump in "${work_dir}"/*.dump; do
    database="$(basename "${dump}" .dump)"
    echo "restoring ${database}"
    dropdb --if-exists --force "${database}"
    createdb "${database}"
    # Owners are kept: the project's tables must stay nelcota_developer's.
    pg_restore --exit-on-error --dbname="${database}" "${dump}"
done

echo "restored snapshot ${snapshot}"
