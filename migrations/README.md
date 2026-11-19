# Project migrations

Place versioned SQL files for the project deployed by this repository in this directory.
The staging and production jobs apply the same files to their respective NelcotaCloud projects.

Name files `<UTC timestamp>_<name>.sql`, for example `20261118140500_create_items.sql`.
See the [project migration guide](../docs/database-migrations.md) for the file and API rules.
