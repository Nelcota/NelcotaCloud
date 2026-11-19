import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type MigrationRecord = components['schemas']['MigrationRecord']

type MigrationHistoryTableProps = {
  migrations: MigrationRecord[]
  memberEmails: ReadonlyMap<string, string>
}

export function MigrationHistoryTable({
  migrations,
  memberEmails,
}: MigrationHistoryTableProps): JSX.Element {
  return (
    <div className="surface min-w-0 overflow-hidden">
      <Table className="table-fixed max-sm:block" aria-label="Migrações aplicadas" role="table">
        <TableHeader className="max-sm:sr-only" role="rowgroup">
          <TableRow role="row">
            <TableHead className="w-2/5 pl-4" scope="col" role="columnheader">
              Migração
            </TableHead>
            <TableHead className="w-[30%]" scope="col" role="columnheader">
              Aplicada em
            </TableHead>
            <TableHead className="pr-4" scope="col" role="columnheader">
              Autor
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="max-sm:block" role="rowgroup">
          {migrations.map((migration) => (
            <TableRow
              key={migration.version}
              role="row"
              className="max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:p-3"
            >
              <th
                className="text-left align-top font-normal max-sm:col-span-2 sm:py-2 sm:pr-2 sm:pl-4"
                scope="row"
                role="rowheader"
              >
                <code className="block text-xs wrap-anywhere">{migration.name}</code>
                <span className="text-muted-foreground font-mono text-xs wrap-anywhere">
                  {migration.version}
                </span>
              </th>
              <TableCell
                className="text-muted-foreground align-top text-xs whitespace-normal max-sm:px-0 max-sm:pb-0"
                role="cell"
              >
                <span className="block sm:hidden" aria-hidden="true">
                  Aplicada em
                </span>
                <time dateTime={migration.applied_at}>{formatDateTime(migration.applied_at)}</time>
              </TableCell>
              <TableCell
                className="text-muted-foreground align-top text-xs wrap-anywhere whitespace-normal max-sm:px-0 max-sm:pb-0 sm:pr-4"
                role="cell"
              >
                <span className="block sm:hidden" aria-hidden="true">
                  Autor
                </span>
                {authorLabel(migration.actor_account_id, memberEmails)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function authorLabel(
  accountId: MigrationRecord['actor_account_id'],
  memberEmails: ReadonlyMap<string, string>,
): string {
  if (accountId === null || accountId === undefined) {
    return 'Chave secreta'
  }

  return memberEmails.get(accountId) ?? accountId
}
