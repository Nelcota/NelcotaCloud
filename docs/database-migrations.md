# Project database migrations

Keep SQL files in the application repository as `migrations/<version>_<name>.sql`. Use fixed-width
UTC timestamps such as `20261118140500_create_items.sql` so the files sort in version order.
Commit the files with consistent line endings across environments.

## Apply from CI

For this repository's Docker Compose deployments, see the [NelcotaCloud deployment workflow](deploy.md#4-updates).
The same action can be used by other application repositories.

In the application repository, configure the GitHub Actions environments `staging` and
`production`. For each environment, set the variable `NELCOTA_API_URL` to its HTTPS API origin and
the secret `NELCOTA_SECRET_KEY` to its NelcotaCloud project's secret API key. Both environments
must already serve the migration API.

Call the [migration action](../.github/actions/apply-project-migrations/action.yml) after checkout
and before the application's publish step. It needs Bash and Python 3.10 or later, both available
on GitHub's Ubuntu runners. Pin the action to a reviewed commit. In this example, replace
`<commit-sha>` and the two publish commands with the application's own deployment commands.

```yaml
jobs:
  staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: Nelcota/NelcotaCloud/.github/actions/apply-project-migrations@<commit-sha>
        with:
          api-url: ${{ vars.NELCOTA_API_URL }}
          secret-key: ${{ secrets.NELCOTA_SECRET_KEY }}
      - run: bash ./deploy.sh staging

  production:
    needs: staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: Nelcota/NelcotaCloud/.github/actions/apply-project-migrations@<commit-sha>
        with:
          api-url: ${{ vars.NELCOTA_API_URL }}
          secret-key: ${{ secrets.NELCOTA_SECRET_KEY }}
      - run: bash ./deploy.sh production
```

The action sends the full set of files in order from `migrations/` by default. Set its
`directory` input if the application keeps its SQL elsewhere. A failed request ends the migration
step and skips publishing for that environment. Earlier migration transactions that committed
remain in place, so a rerun picks up after the last successful file.

- `201 Created` means the SQL and its history entry committed together.
- `200 OK` returns the original entry when the version, name, and exact SQL match. Send the full
  set of files on each deployment so the server checks the files already applied.
- `409 migration_mismatch` means an applied version has a different name or SQL, including a
  whitespace or line-ending change. Restore the original file and make changes in a new version.
- `409 migration_out_of_order` means a newer version was applied before this file. Give the
  unapplied migration a version above the project's latest version.
- A SQL error rolls back the file. Correct it and send the same version again.

The version must be a positive integer no greater than `9007199254740991`. Use lowercase ASCII
letters, digits, underscores, and hyphens for the name, up to 100 characters. SQL files must be
UTF-8 and contain at most 100,000 characters. Scripts run as the project's database developer
role, with a 15-second statement timeout. Use transactional SQL.
PostgreSQL rejects explicit transaction commands, nontransactional statements such as
`CREATE INDEX CONCURRENTLY`, and client commands such as `psql` backslash commands.

## Read the history

Open **Migrações** in the project console to see the successfully applied versions, timestamps,
and authors. The console displays the team member's email when available and **Chave secreta**
for applications that authenticate using a project secret key.

`GET /database/v1/migrations` returns up to 50 records, newest version first. Pass
`?before=<next_before>` to fetch the next page. A null `next_before` marks the end of the history.
