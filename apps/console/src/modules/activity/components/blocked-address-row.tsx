import type { JSX } from 'react'

import { hostOf } from '@/modules/activity/components/address-host'
import { useUnblockAddressMutation } from '@/modules/activity/queries/use-blocked-addresses'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type BlockedAddress = components['schemas']['BlockedAddress']

type BlockedAddressRowProps = { projectId: string; block: BlockedAddress }

/** One block: the address, until when and why, and the button that lifts it. */
export function BlockedAddressRow({ projectId, block }: BlockedAddressRowProps): JSX.Element {
  const unblock = useUnblockAddressMutation(projectId)
  const address = hostOf(block.network)
  const note = block.note ?? ''

  async function lift(): Promise<void> {
    await unblock.mutateAsync(block.id)
    showFlash(`${address} desbloqueado.`)
  }

  return (
    <TableRow>
      <TableCell className="py-2 font-mono text-xs" title={block.network}>
        {address}
      </TableCell>
      <TableCell className="py-2 text-muted-foreground">
        <Expiry expiresAt={block.expires_at ?? null} />
      </TableCell>
      <TableCell className="hidden py-2 text-muted-foreground md:table-cell">
        <span title={note} className="block max-w-64 truncate">
          {note || '—'}
        </span>
      </TableCell>
      <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">
        <Timestamp value={block.created_at} />
      </TableCell>
      <TableCell className="py-1.5 text-end">
        <ConfirmButton
          label="Desbloquear"
          title={`Desbloquear ${address}?`}
          description="Logins, cadastros e links por email deste endereço voltam a ser aceitos."
          confirmLabel="Desbloquear"
          onConfirm={lift}
        />
      </TableCell>
    </TableRow>
  )
}

function Expiry({ expiresAt }: { expiresAt: string | null }): JSX.Element {
  if (expiresAt === null) {
    return <>Até remover</>
  }

  return <Timestamp value={expiresAt} format="relative" />
}
