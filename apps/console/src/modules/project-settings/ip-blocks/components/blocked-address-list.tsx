import type { JSX } from 'react'

import {
  useBlockedAddressesQuery,
  useUnblockAddressMutation,
} from '@/modules/project-settings/ip-blocks/queries/use-blocked-addresses'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type BlockedAddress = components['schemas']['BlockedAddress']

/** The blocks in force, each with the way to lift it. Nothing at all while there are none. */
export function BlockedAddressList({ projectId }: { projectId: string }): JSX.Element | null {
  const blocks = useBlockedAddressesQuery(projectId)
  const unblock = useUnblockAddressMutation(projectId)

  if (blocks.data === undefined) {
    return <ListLoading error={blocks.error} onRetry={() => blocks.refetch()} />
  }

  if (blocks.data.length === 0) {
    return null
  }

  return (
    <div className="grid gap-2">
      <ul className="divide-border divide-y rounded-lg border">
        {blocks.data.map((block) => (
          <BlockRow
            key={block.id}
            block={block}
            isPending={unblock.isPending}
            onUnblock={() => unblock.mutate(block.id)}
          />
        ))}
      </ul>
      <ErrorAlert error={unblock.error} />
    </div>
  )
}

type BlockRowProps = { block: BlockedAddress; isPending: boolean; onUnblock: () => void }

function BlockRow({ block, isPending, onUnblock }: BlockRowProps): JSX.Element {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-medium tabular-nums">{block.network}</span>
        <span className="text-muted-foreground text-sm">{blockSummary(block)}</span>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onUnblock}>
        Desbloquear
      </Button>
    </li>
  )
}

/** "Brute force · até 20/11/2026, 14:00", or just when it was blocked. */
function blockSummary(block: BlockedAddress): string {
  const parts = [block.note ?? '', untilText(block.expires_at ?? null)]

  return (
    parts.filter((part) => part !== '').join(' · ') || `Desde ${formatDateTime(block.created_at)}`
  )
}

function untilText(expiresAt: string | null): string {
  if (expiresAt === null) {
    return ''
  }

  return `até ${formatDateTime(expiresAt)}`
}

type ListLoadingProps = { error: Error | null; onRetry: () => void }

function ListLoading({ error, onRetry }: ListLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return <Skeleton aria-label="Carregando IPs bloqueados" className="h-14 rounded-lg" />
}
