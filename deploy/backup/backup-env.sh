# Sourced by backup.sh and restore.sh: rclone remotes built from environment variables.
#   store:  the object storage (Cloudflare R2 by default, any S3-compatible service works)
#   backup: an encrypting layer over store, so dumps are unreadable without the password

: "${BACKUP_BUCKET:?set BACKUP_BUCKET}"
: "${BACKUP_ENCRYPTION_PASSWORD:?set BACKUP_ENCRYPTION_PASSWORD}"

# Remotes come from the environment only; without this rclone notes the missing config file.
export RCLONE_LOG_LEVEL="${RCLONE_LOG_LEVEL:-ERROR}"

export RCLONE_CONFIG_STORE_TYPE="${RCLONE_CONFIG_STORE_TYPE:-s3}"
export RCLONE_CONFIG_STORE_PROVIDER="${RCLONE_CONFIG_STORE_PROVIDER:-Cloudflare}"
export RCLONE_CONFIG_STORE_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-}"
export RCLONE_CONFIG_STORE_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-}"
export RCLONE_CONFIG_STORE_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"
export RCLONE_CONFIG_STORE_NO_CHECK_BUCKET=true

export RCLONE_CONFIG_BACKUP_TYPE=crypt
export RCLONE_CONFIG_BACKUP_REMOTE="store:${BACKUP_BUCKET}/postgres"
RCLONE_CONFIG_BACKUP_PASSWORD="$(rclone obscure "${BACKUP_ENCRYPTION_PASSWORD}")"
export RCLONE_CONFIG_BACKUP_PASSWORD
export LC_ALL=C

SNAPSHOT_MANIFEST=snapshot.sha256
LEGACY_SNAPSHOT_PATTERN='^[0-9]{8}T[0-9]{6}Z$'
SNAPSHOT_PATTERN='^[0-9]{8}T[0-9]{6}Z(-[a-zA-Z0-9]{10})?$'
TENANT_DATABASE_PATTERN='^tenant_[a-z][a-z0-9_]{2,39}$'

is_project_database() {
    [[ "$1" == "nelcota_control" || "$1" =~ ${TENANT_DATABASE_PATTERN} ]]
}

# Build or verify the manifest using local file names, never paths from the downloaded manifest.
snapshot_checksums() (
    cd "$1" || exit 1
    sha256sum -- globals.sql ./*.dump
)

# The control plane plus every tenant database (tenant_<slug>).
list_databases() {
    psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --dbname=postgres --command \
        "SELECT datname FROM pg_database WHERE datname = 'nelcota_control' OR datname LIKE 'tenant\_%' ORDER BY datname"
}
