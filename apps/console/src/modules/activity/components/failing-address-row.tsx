import { Ban, ListFilter } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { Button } from '@/shared/ui/primitives/button'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type FailingAddress = components['schemas']['FailingAddress']

type FailingAddressRowProps = {
  address: FailingAddress
  isBlocked: boolean
  actions: { onBlock: (address: string) => void; onShowEvents: (address: string) => void }
}

/** One address: how often it failed, how many accounts it tried, and when it was last seen. */
export function FailingAddressRow({
  address,
  isBlocked,
  actions,
}: FailingAddressRowProps): JSX.Element {
  const ip = address.ip_address

  return (
    <TableRow>
      <TableCell className="py-2 font-mono text-xs">{ip}</TableCell>
      <TableCell className="py-2 text-end tabular-nums">{formatCount(address.failures)}</TableCell>
      <TableCell className="py-2 text-end tabular-nums">{formatCount(address.accounts)}</TableCell>
      <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">
        <Timestamp value={address.last_seen_at} format="relative" />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => actions.onShowEvents(ip)}>
            <ListFilter aria-hidden data-icon="inline-start" />
            Ver eventos
          </Button>
          <BlockAction ip={ip} isBlocked={isBlocked} onBlock={actions.onBlock} />
        </div>
      </TableCell>
    </TableRow>
  )
}

type BlockActionProps = { ip: string; isBlocked: boolean; onBlock: (address: string) => void }

function BlockAction({ ip, isBlocked, onBlock }: BlockActionProps): JSX.Element {
  if (isBlocked) {
    return <StatusBadge tone="error">Bloqueado</StatusBadge>
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={() => onBlock(ip)}>
      <Ban aria-hidden data-icon="inline-start" />
      Bloquear
    </Button>
  )
}
