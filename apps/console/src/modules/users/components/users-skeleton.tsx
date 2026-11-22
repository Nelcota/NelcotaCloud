import type { JSX } from 'react'

import { USER_COLUMN_VISIBILITY as COLUMNS } from '@/modules/users/components/user-columns'
import { UsersTableHeader } from '@/modules/users/components/users-table-header'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/shared/ui/primitives/table'

const SKELETON_ROWS = [0, 1, 2, 3, 4]

/** Placeholder rows with the users table's columns while the first page loads. */
export function UsersSkeleton(): JSX.Element {
  return (
    <Table aria-busy="true" aria-label="Carregando usuários">
      <UsersTableHeader />
      <TableBody>
        {SKELETON_ROWS.map((row) => (
          <TableRow key={row}>
            <TableCell>
              <span className="flex items-center gap-2.5">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </span>
            </TableCell>
            <TableCell className={COLUMNS.id}>
              <Skeleton className="h-3 w-16" />
            </TableCell>
            <TableCell className={COLUMNS.methods}>
              <Skeleton className="h-3 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24 rounded-md" />
            </TableCell>
            <TableCell className={COLUMNS.createdAt}>
              <Skeleton className="h-3 w-12" />
            </TableCell>
            <TableCell className={COLUMNS.lastSignIn}>
              <Skeleton className="h-3 w-12" />
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
