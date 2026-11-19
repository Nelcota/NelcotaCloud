SNAPSHOT_MANIFEST=complete.sha256
CLUSTER_ARCHIVE=cluster.tar.gz

valid_snapshot_name() {
    [[ "${1}" =~ ^[0-9]{8}T[0-9]{6}([0-9]{9})?Z$ ]]
}

write_snapshot_manifest() (
    cd -- "${1}" || return
    if [[ -f "${CLUSTER_ARCHIVE}" ]]; then
        if [[ -f storage.keys && -f storage.location ]]; then
            sha256sum -- "${CLUSTER_ARCHIVE}" storage.keys storage.location >"${SNAPSHOT_MANIFEST}"
            return
        fi

        sha256sum -- "${CLUSTER_ARCHIVE}" >"${SNAPSHOT_MANIFEST}"
        return
    fi

    [[ -f nelcota_control.dump && -f globals.sql ]] || return 1
    sha256sum -- globals.sql *.dump >"${SNAPSHOT_MANIFEST}"
)

verify_snapshot_manifest() (
    cd -- "${1}" || return
    local checksum filename
    local -A entries=()

    [[ -f "${SNAPSHOT_MANIFEST}" ]] || return 1
    while IFS=' ' read -r checksum filename; do
        [[ "${checksum}" =~ ^[0-9a-f]{64}$ ]] || return 1
        [[ "${filename}" =~ ^(cluster\.tar\.gz|globals\.sql|storage\.keys|storage\.location|nelcota_control\.dump|tenant_[a-z][a-z0-9_]{2,39}\.dump)$ ]] || return 1
        [[ -z "${entries[${filename}]:-}" ]] || return 1
        entries["${filename}"]=1
    done <"${SNAPSHOT_MANIFEST}"

    if [[ -n "${entries[${CLUSTER_ARCHIVE}]:-}" ]]; then
        if [[ -e storage.keys || -e storage.location ]]; then
            [[ "${#entries[@]}" -eq 3 && -n "${entries[storage.keys]:-}" && -n "${entries[storage.location]:-}" ]] || return 1
        else
            [[ "${#entries[@]}" -eq 1 ]] || return 1
        fi
        sha256sum --check --strict --status -- "${SNAPSHOT_MANIFEST}"
        return
    fi

    [[ ! -e "${CLUSTER_ARCHIVE}" ]] || return 1
    [[ -n "${entries[globals.sql]:-}" && -n "${entries[nelcota_control.dump]:-}" ]] || return 1
    for filename in *.dump; do
        [[ -n "${entries[${filename}]:-}" ]] || return 1
    done

    sha256sum --check --strict --status -- "${SNAPSHOT_MANIFEST}"
)
