#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 1 || "$1" != check && "$1" != publish ]]; then
    printf 'Usage: ssh-compose.sh check|publish\n' >&2
    exit 1
fi

: "${GITHUB_SHA:?Set GITHUB_SHA}" "${GITHUB_WORKSPACE:?Set GITHUB_WORKSPACE}"
: "${NELCOTA_API_URL:?Set NELCOTA_API_URL}" "${NELCOTA_COMPOSE_PROJECT:?Set NELCOTA_COMPOSE_PROJECT}"
: "${NELCOTA_COMPOSE_ENV_FILE:?Set NELCOTA_COMPOSE_ENV_FILE}"
: "${NELCOTA_SSH_TARGET:?Set NELCOTA_SSH_TARGET}" "${NELCOTA_SSH_PORT:?Set NELCOTA_SSH_PORT}"
: "${NELCOTA_SSH_PRIVATE_KEY:?Set NELCOTA_SSH_PRIVATE_KEY}"
: "${NELCOTA_SSH_KNOWN_HOSTS:?Set NELCOTA_SSH_KNOWN_HOSTS}"

# OpenSSH passes this command through the remote account's shell.
shell_quote() {
    printf "'%s'" "${1//\'/\'\\\'\'}"
}

umask 077
credentials=$(mktemp -d)
trap 'rm -rf -- "$credentials"' EXIT
printf '%s\n' "$NELCOTA_SSH_PRIVATE_KEY" > "$credentials/key"
printf '%s\n' "$NELCOTA_SSH_KNOWN_HOSTS" > "$credentials/known_hosts"
unset NELCOTA_SSH_PRIVATE_KEY

script=$(<"$GITHUB_WORKSPACE/deploy/compose-release.sh")
command="bash -c $(shell_quote "$script") -- $(shell_quote "$1")"
command+=" $(shell_quote "$NELCOTA_COMPOSE_ENV_FILE") $(shell_quote "$NELCOTA_COMPOSE_PROJECT")"
command+=" $(shell_quote "${NELCOTA_API_URL%/}")"

git -C "$GITHUB_WORKSPACE" archive --format=tar "$GITHUB_SHA" |
    ssh -F /dev/null -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
        -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
        -o "UserKnownHostsFile=$credentials/known_hosts" -o GlobalKnownHostsFile=/dev/null \
        -i "$credentials/key" -p "$NELCOTA_SSH_PORT" -- "$NELCOTA_SSH_TARGET" "$command"
