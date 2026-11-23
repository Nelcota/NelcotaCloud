import type { JSX } from 'react'

import { BlockedAddressRow } from '@/modules/activity/components/blocked-address-row'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import { LoadError } from '@/shared/ui/load-error'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

/** The blocks in force: logins, signups and emailed links from them are refused. */
export function BlockedAddressesTable({ projectId }: { projectId: string }): JSX.Element {
  const blocks = useBlockedAddressesQuery(projectId)
  const list = blocks.data ?? []

  if (blocks.error !== null) {
    return (
      <div className="p-3">
        <LoadError error={blocks.error} onRetry={() => blocks.refetch()} />
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
        Nenhum endereço bloqueado.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-10">Endereço</TableHead>
          <TableHead className="h-10">Expira</TableHead>
          <TableHead className="hidden h-10 md:table-cell">Nota</TableHead>
          <TableHead className="hidden h-10 sm:table-cell">Bloqueado em</TableHead>
          <TableHead className="h-10">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((block) => (
          <BlockedAddressRow key={block.id} projectId={projectId} block={block} />
        ))}
      </TableBody>
    </Table>
  )
}
