#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=snapshot-manifest.sh
. "$(dirname "${BASH_SOURCE[0]}")/snapshot-manifest.sh"

fixture="$(mktemp --directory)"
trap 'rm -rf "${fixture}"' EXIT
printf '%s\n' globals >"${fixture}/globals.sql"
printf '%s\n' control >"${fixture}/nelcota_control.dump"
printf '%s\n' tenant >"${fixture}/tenant_acme.dump"

assert_refused() {
    if verify_snapshot_manifest "${fixture}"; then
        echo "an invalid snapshot was accepted: ${1}" >&2
        exit 1
    fi
}

assert_refused 'missing completion marker'
write_snapshot_manifest "${fixture}"
verify_snapshot_manifest "${fixture}"
mv "${fixture}/tenant_acme.dump" "${fixture}/missing"
assert_refused 'missing tenant dump'
mv "${fixture}/missing" "${fixture}/tenant_acme.dump"
cp "${fixture}/tenant_acme.dump" "${fixture}/tenant_extra.dump"
assert_refused 'extra unlisted dump'
rm "${fixture}/tenant_extra.dump"
printf '%s\n' changed >>"${fixture}/tenant_acme.dump"
assert_refused 'corrupt dump'
valid_snapshot_name '20261118T203000000000000Z'
if valid_snapshot_name '../snapshot'; then
    exit 1
fi

rm "${fixture}/globals.sql" "${fixture}/nelcota_control.dump" "${fixture}/tenant_acme.dump"
printf '%s\n' cluster >"${fixture}/${CLUSTER_ARCHIVE}"
write_snapshot_manifest "${fixture}"
verify_snapshot_manifest "${fixture}"
printf '%s\n' changed >>"${fixture}/${CLUSTER_ARCHIVE}"
assert_refused 'corrupt cluster archive'
