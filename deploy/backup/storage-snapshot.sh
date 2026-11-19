# Read the catalog from the recovered PostgreSQL snapshot so its ready objects and the
# encrypted object inventory describe the same recovery point.
storage_inventory() {
    local output=$1 location=$2
    local has_catalog wrong_location
    has_catalog=$(psql --no-psqlrc -At -d nelcota_control -v ON_ERROR_STOP=1 \
        -c "SELECT to_regclass('public.storage_objects') IS NOT NULL") || return
    : >"${output}" || return
    if [[ "${has_catalog}" == f ]]; then
        return 0
    fi

    wrong_location=$(psql --no-psqlrc -At -d nelcota_control -v ON_ERROR_STOP=1 -v location="${location}" <<'SQL'
SELECT EXISTS (
    SELECT 1 FROM public.storage_objects WHERE is_ready AND location IS DISTINCT FROM :'location'
);
SQL
    ) || return
    [[ "${wrong_location}" == f ]] || {
        echo "ready storage objects belong to an unknown or different bucket" >&2
        return 1
    }

    psql --no-psqlrc -At -d nelcota_control -v ON_ERROR_STOP=1 -c "
        SELECT 'projects/' || tenant_id || '/buckets/' || bucket_id || '/' || id
        FROM public.storage_objects WHERE is_ready
    " | LC_ALL=C sort >"${output}"
}

snapshot_storage_inventory() (
    local work_dir=$1 endpoint=$2
    local cluster="${work_dir}/inventory-cluster"
    local socket="${work_dir}/inventory-socket"
    trap 'if gosu postgres pg_ctl -D "${cluster}" status >/dev/null 2>&1; then
        gosu postgres pg_ctl -D "${cluster}" -m fast -w stop >/dev/null
    fi' EXIT

    chmod 0711 "${work_dir}" || return
    install -d -m 0700 -o postgres -g postgres "${socket}" || return
    cp -a --reflink=auto -- "${work_dir}/cluster" "${cluster}" || return
    chown -R postgres:postgres "${cluster}" || return
    chmod 0700 "${cluster}" || return
    gosu postgres pg_ctl -D "${cluster}" -l "${socket}/startup.log" -w \
        -o "-p 5432 -c listen_addresses='' -c unix_socket_directories=${socket} -c archive_mode=off" start >/dev/null || return

    PGHOST="${socket}" PGPORT=5432 storage_inventory "${work_dir}/storage.keys" "${endpoint}"
)

configure_storage_remote() {
    local endpoint=$1 key=$2 secret=$3
    export RCLONE_CONFIG_PROJECTFILES_TYPE=s3 RCLONE_CONFIG_PROJECTFILES_PROVIDER=Cloudflare
    export RCLONE_CONFIG_PROJECTFILES_ENDPOINT="${endpoint}"
    export RCLONE_CONFIG_PROJECTFILES_ACCESS_KEY_ID="${key}"
    export RCLONE_CONFIG_PROJECTFILES_SECRET_ACCESS_KEY="${secret}"
    export RCLONE_CONFIG_PROJECTFILES_NO_CHECK_BUCKET=true
}

archive_storage() {
    local work_dir=$1 snapshot=$2
    local bucket="${STORAGE_BACKUP_SOURCE_BUCKET:?set STORAGE_BACKUP_SOURCE_BUCKET}"
    local endpoint="${STORAGE_BACKUP_SOURCE_ENDPOINT:?set STORAGE_BACKUP_SOURCE_ENDPOINT}"
    local origin="${endpoint%/}"
    local location="${origin,,}/${bucket}"
    local source="projectfiles:${bucket}" destination="backup:${snapshot}/objects"

    configure_storage_remote "${origin}" "${STORAGE_BACKUP_SOURCE_ACCESS_KEY_ID:?}" "${STORAGE_BACKUP_SOURCE_SECRET_ACCESS_KEY:?}"
    snapshot_storage_inventory "${work_dir}" "${location}" || return
    printf '%s\n' "${location}" >"${work_dir}/storage.location" || return

    if [[ -s "${work_dir}/storage.keys" ]]; then
        rclone copy --metadata --immutable --no-traverse --files-from-raw "${work_dir}/storage.keys" "${source}" "${destination}" || return
        check_storage_copy "${work_dir}/storage.keys" "${source}" "${destination}" || return
    fi
}

check_storage_copy() {
    local inventory=$1 source=$2 destination=$3
    rclone lsf --recursive --files-only "${destination}" | LC_ALL=C sort | cmp -s "${inventory}" - || return
    rclone check --download --one-way --files-from-raw "${inventory}" "${source}" "${destination}"
}

restore_storage() {
    local work_dir=$1 snapshot=$2
    local endpoint="${STORAGE_RESTORE_ENDPOINT:-}" bucket="${STORAGE_RESTORE_BUCKET:-}"
    local source="backup:${snapshot}/objects" destination="projectfiles:${bucket}"
    local origin="${endpoint%/}"
    local restored_location="${origin,,}/${bucket}"
    local original_location=''
    if [[ -f "${work_dir}/storage.location" && -f "${work_dir}/storage.keys" ]]; then
        original_location=$(<"${work_dir}/storage.location")
    fi

    storage_inventory "${work_dir}/restored.keys" "${original_location}" || return
    if [[ -n "${original_location}" ]]; then
        cmp -s "${work_dir}/storage.keys" "${work_dir}/restored.keys" || return
        [[ -n "${endpoint}" && -n "${bucket}" ]] || {
            echo "set STORAGE_RESTORE_ENDPOINT and STORAGE_RESTORE_BUCKET to an empty private bucket" >&2
            return 1
        }
        configure_storage_remote "${origin}" "${STORAGE_RESTORE_ACCESS_KEY_ID:?}" "${STORAGE_RESTORE_SECRET_ACCESS_KEY:?}"
        local existing
        existing=$(rclone lsf --max-depth 1 "${destination}") || return
        [[ -z "${existing}" ]] || {
            echo "the Storage restore bucket is not empty" >&2
            return 1
        }
        if [[ -s "${work_dir}/restored.keys" ]]; then
            rclone copy --metadata --immutable "${source}" "${destination}" || return
            check_storage_copy "${work_dir}/storage.keys" "${source}" "${destination}" || return
        fi

        rebind_restored_storage "${original_location}" "${restored_location}" || return
    fi
}

rebind_restored_storage() {
    psql --no-psqlrc -q -d nelcota_control -v ON_ERROR_STOP=1 -v original="$1" -v restored="$2" <<'SQL'
SELECT to_regclass('public.storage_objects') IS NOT NULL AS has_catalog \gset
\if :has_catalog
BEGIN;
-- Incomplete uploads and queued removals have no bytes in this private replacement bucket.
DELETE FROM public.storage_objects WHERE NOT is_ready AND location = :'original';
DELETE FROM public.storage_object_deletions WHERE location = :'original';
UPDATE public.storage_buckets SET location = :'restored' WHERE location = :'original';
UPDATE public.storage_objects SET location = :'restored' WHERE location = :'original';
COMMIT;
\endif
SQL
}
