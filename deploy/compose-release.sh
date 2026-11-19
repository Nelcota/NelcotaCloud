#!/usr/bin/env bash
set -euo pipefail

operation=$1
env_file=$2
project=$3
api_url=$4

[[ "$env_file" == /* && -f "$env_file" && -r "$env_file" ]] || {
    printf 'The Compose environment file must be an absolute, readable path on the VPS.\n' >&2
    exit 1
}

[[ "$project" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || {
    printf 'The Compose project name is invalid.\n' >&2
    exit 1
}

release=$(mktemp -d)
trap 'rm -rf -- "$release"' EXIT
tar -xf - -C "$release"
compose=(docker compose --project-name "$project" --env-file "$env_file"
    --file "$release/docker-compose.prod.yml")

"${compose[@]}" config --quiet >/dev/null 2>&1 || {
    printf 'Compose could not load its configuration. Check the environment file on the VPS.\n' >&2
    exit 1
}

domain=$("${compose[@]}" config --environment 2>/dev/null | sed -n 's/^API_DOMAIN=//p') || {
    printf 'Compose could not resolve API_DOMAIN on the VPS.\n' >&2
    exit 1
}

if [[ -z "$domain" || "https://$domain" != "$api_url" ]]; then
    printf 'NELCOTA_API_URL must match the HTTPS origin of API_DOMAIN on the VPS.\n' >&2
    exit 1
fi

docker info --format '{{.ServerVersion}}' >/dev/null
postgres_container=$("${compose[@]}" ps --all --quiet postgres)
if [[ -z "$postgres_container" ]]; then
    printf 'The existing PostgreSQL container was not found. Check the Compose project name.\n' >&2
    exit 1
fi

case "$operation" in
    check)
        ;;
    publish)
        "${compose[@]}" build
        "${compose[@]}" stop webhook-worker
        "${compose[@]}" up --detach --wait --wait-timeout 600
        ;;
    *)
        printf 'Unknown Compose deployment operation.\n' >&2
        exit 1
        ;;
esac
