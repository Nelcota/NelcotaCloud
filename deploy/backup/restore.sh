#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=backup-env.sh
. "$(dirname -- "${BASH_SOURCE[0]}")/backup-env.sh"

list_snapshots() {
    echo "Snapshots (newest last):"
    {
        rclone lsf --dirs-only backup: | sed 's#/$##' | awk '/^[0-9]{8}T[0-9]{6}Z$/'
        rclone lsf --recursive --files-only --include "/*/${SNAPSHOT_MANIFEST}" backup: | cut -d / -f 1
    } | sort -u
}

snapshot="${1:-}"
if [[ -z "${snapshot}" ]]; then
    list_snapshots
    exit 0
fi

if [[ ! "${snapshot}" =~ ${SNAPSHOT_PATTERN} ]]; then
    echo "invalid snapshot name" >&2
    exit 1
fi

work_dir="$(mktemp --directory "${TMPDIR:-/tmp}/nelcota-restore.XXXXXXXXXX")"
run_id="${work_dir##*.}"
declare -a candidates=() originals=() previous=()
declare -A staged=()
swapped=0

cleanup() {
    local database
    if (( swapped == 0 )); then
        for database in "${candidates[@]}"; do
            dropdb --if-exists --maintenance-db=postgres -- "${database}" ||
                printf 'could not remove staged database %s\n' "${database}" >&2
        done
    fi

    rm -rf -- "${work_dir}"
}
trap cleanup EXIT
rclone copy "backup:${snapshot}" "${work_dir}"

if [[ ! -s "${work_dir}/nelcota_control.dump" ]]; then
    echo "snapshot is missing the control-plane dump" >&2
    exit 1
fi

for dump in "${work_dir}"/*.dump; do
    database="$(basename -- "${dump}" .dump)"
    if ! is_project_database "${database}"; then
        echo "snapshot has an unexpected database name" >&2
        exit 1
    fi
done

if [[ -f "${work_dir}/${SNAPSHOT_MANIFEST}" ]]; then
    if ! snapshot_checksums "${work_dir}" | cmp --silent "${work_dir}/${SNAPSHOT_MANIFEST}" -; then
        echo "snapshot does not match its checksums" >&2
        exit 1
    fi
elif [[ ! "${snapshot}" =~ ${LEGACY_SNAPSHOT_PATTERN} ]]; then
    echo "snapshot was never published" >&2
    exit 1
fi

control_candidate=''
for dump in "${work_dir}"/*.dump; do
    database="$(basename -- "${dump}" .dump)"
    index="${#candidates[@]}"
    candidate="nc_restore_${run_id}_${index}"
    old="nc_previous_${run_id}_${index}"
    createdb --maintenance-db=postgres -- "${candidate}"
    candidates+=("${candidate}")
    originals+=("${database}")
    previous+=("${old}")
    staged["${database}"]="${candidate}"
    psql --no-psqlrc --set=ON_ERROR_STOP=1 --dbname=postgres \
        --command "REVOKE ALL ON DATABASE \"${candidate}\" FROM PUBLIC"
    pg_restore --single-transaction --exit-on-error --dbname="${candidate}" "${dump}"

    if [[ "${database}" == "nelcota_control" ]]; then
        control_candidate="${candidate}"
    fi
done

# Logical dumps of separate databases can overlap provisioning. Check the restored inventory
# before changing any live database name, including for snapshots from older releases.
expected="$(psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align \
    --dbname="${control_candidate}" --field-separator='|' \
    --command "SELECT 'tenant_' || slug, id FROM public.tenants ORDER BY slug")"
while IFS='|' read -r database tenant_id; do
    if [[ -z "${database}" ]]; then
        continue
    fi

    if ! is_project_database "${database}" || [[ ! -s "${work_dir}/${database}.dump" ]]; then
        echo "snapshot is missing a tenant listed in the control plane" >&2
        exit 1
    fi

    # A recycled slug can refer to different projects in two otherwise valid dumps.
    restored_id="$(psql --no-psqlrc --set=ON_ERROR_STOP=1 --quiet --tuples-only --no-align \
        --dbname="${staged[$database]}" <<'SQL'
SELECT to_regclass('auth.tenant_identity') IS NOT NULL AS has_identity \gset
\if :has_identity
SELECT tenant_id FROM auth.tenant_identity WHERE singleton;
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'tenant_identity' AND column_name = 'prepared_through'
) AS has_preparation \gset
\if :has_preparation
UPDATE auth.tenant_identity SET prepared_through = 0 WHERE singleton;
\endif
\else
SELECT 'legacy';
\endif
SQL
    )"
    if [[ "${restored_id}" != "${tenant_id}" && "${restored_id}" != "legacy" ]]; then
        printf 'tenant identity does not match for %s\n' "${database}" >&2
        exit 1
    fi
done <<<"${expected}"

# PostgreSQL rejects a rename when other sessions are connected. All renames roll back
# together if this or any later statement fails.
swap_sql="${work_dir}/swap.sql"
{
    for index in "${!candidates[@]}"; do
        database="${originals[index]}"
        candidate="${candidates[index]}"
        old="${previous[index]}"
        printf "SELECT format('ALTER DATABASE %%I RENAME TO %%I', '%s', '%s') FROM pg_database WHERE datname = '%s'\n" \
            "${database}" "${old}" "${database}"
        printf '%s\n' '\gexec'
        printf 'ALTER DATABASE "%s" RENAME TO "%s";\n' "${candidate}" "${database}"
        if [[ "${database}" == "nelcota_control" ]]; then
            roles="rolname = 'nelcota_control_runtime'"
        else
            roles="rolname IN ('nelcota_tenant_runtime', 'nelcota_t_${database#tenant_}')"
            printf 'GRANT TEMPORARY ON DATABASE "%s" TO nelcota_developer;\n' "${database}"
        fi

        printf "SELECT format('GRANT CONNECT ON DATABASE %%I TO %%I', '%s', rolname) FROM pg_roles WHERE %s\n" \
            "${database}" "${roles}"
        printf '%s\n' '\gexec'
    done
} >"${swap_sql}"
psql --no-psqlrc --set=ON_ERROR_STOP=1 --single-transaction --dbname=postgres --file="${swap_sql}"
swapped=1

for database in "${previous[@]}"; do
    dropdb --if-exists --maintenance-db=postgres -- "${database}" ||
        printf 'restored successfully; previous database %s needs cleanup\n' "${database}" >&2
done

printf 'restored snapshot %s\n' "${snapshot}"
