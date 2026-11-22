import type { JSX } from 'react'
import { useState } from 'react'

import { hostOf } from '@/modules/activity/components/address-host'
import { BlockAddressDialog } from '@/modules/activity/components/block-address-dialog'
import { FailingAddressRow } from '@/modules/activity/components/failing-address-row'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type Schemas = components['schemas']

type FailingAddressesTableProps = {
  projectId: string
  addresses: Schemas['FailingAddress'][]
  blocks: Schemas['BlockedAddress'][]
  onShowEvents: (address: string) => void
}

/** Each address with refused logins in the period, most first, with its two actions. */
export function FailingAddressesTable(props: FailingAddressesTableProps): JSX.Element {
  const [blockTarget, setBlockTarget] = useState<string | null>(null)
  const blocked = new Set(props.blocks.map((block) => hostOf(block.network)))

  if (props.addresses.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
        Nenhum login recusado no período.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9">IP</TableHead>
            <TableHead className="h-9 text-end">Recusas</TableHead>
            <TableHead className="h-9 text-end">Contas</TableHead>
            <TableHead className="hidden h-9 sm:table-cell">Última vez</TableHead>
            <TableHead className="h-9">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.addresses.map((address) => (
            <FailingAddressRow
              key={address.ip_address}
              address={address}
              isBlocked={blocked.has(address.ip_address)}
              actions={{ onBlock: setBlockTarget, onShowEvents: props.onShowEvents }}
            />
          ))}
        </TableBody>
      </Table>
      <BlockAddressDialog
        projectId={props.projectId}
        address={blockTarget}
        onClose={() => setBlockTarget(null)}
      />
    </>
  )
}
