import http.client
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import SplitResult, urlsplit


MIGRATIONS_PATH = "/database/v1/migrations"
REQUEST_TIMEOUT_SECONDS = 65
MAX_ERROR_RESPONSE_BYTES = 4096
MIGRATION_FILENAME = re.compile(r"([0-9]{14})_([a-z0-9_-]{1,100})\.sql")
EXPECTED_ERROR_CODES = {
    "invalid_request",
    "migration_mismatch",
    "migration_out_of_order",
    "query_timeout",
    "sql_error",
}


class MigrationError(Exception):
    """An error safe to print in a workflow log."""


def api_origin(value: str) -> SplitResult:
    try:
        origin = urlsplit(value)
        port = origin.port
    except ValueError:
        raise MigrationError("NELCOTA_API_URL is not a valid HTTPS origin.") from None

    if (
        origin.scheme != "https"
        or not origin.hostname
        or origin.username is not None
        or origin.password is not None
        or origin.path not in ("", "/")
        or origin.query
        or origin.fragment
        or port == 0
    ):
        raise MigrationError("NELCOTA_API_URL must be an HTTPS origin.")

    return origin


def migration_files(directory: Path) -> list[tuple[Path, int, str]]:
    if not directory.is_dir():
        raise MigrationError("The migrations directory does not exist.")

    migrations = []
    versions = set()
    for file in sorted(directory.glob("*.sql")):
        match = MIGRATION_FILENAME.fullmatch(file.name)
        if match is None:
            raise MigrationError(f"Invalid migration filename {file.name!r}.")

        version = int(match[1])
        if version == 0 or version in versions:
            raise MigrationError(f"Invalid or duplicate version in {file.name!r}.")

        versions.add(version)
        migrations.append((file, version, match[2]))

    return migrations


def encode_migration(file: Path, version: int, name: str) -> bytes:
    try:
        sql = file.read_bytes().decode("utf-8")
    except (OSError, UnicodeError):
        raise MigrationError(f"Cannot read {file.name} as UTF-8.") from None

    return json.dumps({"version": version, "name": name, "sql": sql}).encode("utf-8")


def rejection(response: http.client.HTTPResponse) -> str:
    status = f"HTTP {response.status}"
    try:
        body = json.loads(response.read(MAX_ERROR_RESPONSE_BYTES))
    except (ValueError, OSError, http.client.HTTPException):
        return status

    if isinstance(body, dict):
        code = body.get("error")
        if isinstance(code, str) and code in EXPECTED_ERROR_CODES:
            return f"{status}, {code}"

    return status


def apply_migrations(directory: Path, origin: SplitResult, secret_key: str) -> None:
    migrations = migration_files(directory)
    if not migrations:
        print("No migration files found.")
        return

    headers = {"apikey": secret_key, "content-type": "application/json"}
    for file, version, name in migrations:
        payload = encode_migration(file, version, name)
        try:
            result = apply_migration(origin, headers, payload)
        except (OSError, http.client.HTTPException):
            raise MigrationError(f"{file.name}: the API request failed.") from None
        except MigrationError as error:
            raise MigrationError(f"{file.name}: {error}") from None

        print(f"{file.name}: {result}.", flush=True)


def apply_migration(origin: SplitResult, headers: dict[str, str], payload: bytes) -> str:
    connection = http.client.HTTPSConnection(
        origin.hostname, origin.port, timeout=REQUEST_TIMEOUT_SECONDS
    )
    try:
        connection.request("POST", MIGRATIONS_PATH, body=payload, headers=headers)
        with connection.getresponse() as response:
            if response.status == 201:
                return "applied"

            if response.status == 200:
                return "already applied"

            raise MigrationError(rejection(response))
    finally:
        connection.close()


def main(directory: Path) -> int:
    try:
        origin = api_origin(os.environ.get("NELCOTA_API_URL", ""))
        key = os.environ.get("NELCOTA_SECRET_KEY", "")
        if not key.strip():
            raise MigrationError("NELCOTA_SECRET_KEY is required.")

        if not key.isascii() or any(character.isspace() for character in key):
            raise MigrationError("NELCOTA_SECRET_KEY has an invalid format.")

        apply_migrations(directory, origin, key)
    except MigrationError as error:
        print(error, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: apply.py <migrations-directory>")

    sys.exit(main(Path(sys.argv[1])))
