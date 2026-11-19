#!/usr/bin/env bash
# Stages a snapshot on an empty PostgreSQL volume and verifies it by starting it in isolation.
set -euo pipefail

# shellcheck source=backup-env.sh
. /usr/local/bin/backup-env.sh
# shellcheck source=snapshot-manifest.sh
. /usr/local/bin/snapshot-manifest.sh

snapshot="${1:-}"

if [[ -z "${snapshot}" ]]; then
    echo "Complete snapshots (newest last):"
    rclone lsf --dirs-only backup: | sed 's#/$##' | sort | while IFS= read -r candidate; do
        if valid_snapshot_name "${candidate}"; then
            marker="$(rclone lsf --files-only --include "/${SNAPSHOT_MANIFEST}" "backup:${candidate}")"
            if [[ "${marker}" == "${SNAPSHOT_MANIFEST}" ]]; then
                printf '%s\n' "${candidate}"
            fi
        fi
    done
    exit 0
fi

if ! valid_snapshot_name "${snapshot}"; then
    echo "invalid snapshot name" >&2
    exit 1
fi

restore_volume="/restore"
if [[ ! -d "${restore_volume}" || -n "$(ls -A -- "${restore_volume}")" ]] ||
    ! mountpoint -q "${restore_volume}"; then
    echo "mount an empty PostgreSQL volume at ${restore_volume}" >&2
    exit 1
fi

work_dir="$(mktemp --directory)"
target="${restore_volume}/18/docker"
socket="${work_dir}/socket"
export PGHOST="${socket}" PGPORT=5432
umask 077

stop_cluster() {
    if gosu postgres pg_ctl --pgdata="${target}" status >/dev/null 2>&1; then
        gosu postgres pg_ctl --pgdata="${target}" --mode=fast --wait stop
    fi
}

cleanup() {
    local status=$?
    stop_cluster || status=1
    rm -rf -- "${work_dir}"
    exit "${status}"
}

start_cluster() {
    gosu postgres pg_ctl --pgdata="${target}" --log="${socket}/startup.log" --wait \
        --options="-c listen_addresses='' -c unix_socket_directories=${socket}" start
}

restore_legacy_snapshot() {
    [[ "${PGUSER}" =~ ^[a-z_][a-z_0-9]*$ ]]
    local password_file="${socket}/bootstrap-password"
    printf '%s\n' "${PGPASSWORD:?set PGPASSWORD}" >"${password_file}"
    chown postgres:postgres "${password_file}"
    gosu postgres initdb --pgdata="${target}" --username="${PGUSER}" \
        --auth-local=trust --auth-host=scram-sha-256 --pwfile="${password_file}" >/dev/null
    rm -- "${password_file}"
    # Compose clients connect across its private network.
    printf '%s\n' 'host all all all scram-sha-256' >>"${target}/pg_hba.conf"
    start_cluster

    sed "/^CREATE ROLE ${PGUSER};$/d" "${work_dir}/globals.sql" | \
        psql --no-psqlrc --dbname=postgres --set=ON_ERROR_STOP=1 >/dev/null

    local dump database
    for dump in "${work_dir}"/*.dump; do
        database="$(basename "${dump}" .dump)"
        createdb "${database}"
        pg_restore --single-transaction --exit-on-error --dbname="${database}" "${dump}"
    done
}

restore_snapshot() {
    if [[ -f "${work_dir}/${CLUSTER_ARCHIVE}" ]]; then
        gzip --decompress --stdout "${work_dir}/${CLUSTER_ARCHIVE}" | \
            gosu postgres tar --extract --file=- --directory="${target}" --no-same-owner --no-same-permissions
        pg_verifybackup --quiet "${target}"
        start_cluster
        return
    fi

    restore_legacy_snapshot
}

trap cleanup EXIT
chmod 0711 "${work_dir}"
install --directory --owner=postgres --group=postgres --mode=0700 "${socket}"
rclone copy "backup:${snapshot}" "${work_dir}"

if ! verify_snapshot_manifest "${work_dir}"; then
    echo "snapshot ${snapshot} is incomplete or corrupt" >&2
    exit 1
fi

install --directory --owner=postgres --group=postgres --mode=0700 "${target}"
restore_snapshot

missing_databases="$(psql --no-psqlrc --dbname=nelcota_control --set=ON_ERROR_STOP=1 \
    --tuples-only --no-align --command \
    "SELECT count(*) FROM public.tenants WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname::text = 'tenant_' || slug)")"
if [[ "${missing_databases}" != "0" ]]; then
    echo "snapshot is missing ${missing_databases} active tenant databases" >&2
    exit 1
fi

stop_cluster
echo "verified snapshot ${snapshot} on ${restore_volume}; ready for cutover"
