import type { JSX } from 'react'

import { USER_COLUMN_VISIBILITY } from '@/modules/users/components/user-columns'
import { TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

/** The users table's column names, shared by the rows and their loading skeleton. */
export function UsersTableHeader(): JSX.Element {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Email</TableHead>
        <TableHead className={USER_COLUMN_VISIBILITY.id}>ID</TableHead>
        <TableHead className={USER_COLUMN_VISIBILITY.methods}>Entra com</TableHead>
        <TableHead>Situação</TableHead>
        <TableHead className={USER_COLUMN_VISIBILITY.createdAt}>Criada</TableHead>
        <TableHead className={USER_COLUMN_VISIBILITY.lastSignIn}>Último login</TableHead>
        <TableHead className="w-12">
          <span className="sr-only">Ações</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}
