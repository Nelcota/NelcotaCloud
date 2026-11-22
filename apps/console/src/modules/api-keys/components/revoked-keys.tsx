import type { JSX } from 'react'

import { DisclosurePanel } from '@/modules/api-keys/components/disclosure-panel'
import { isRevokedKey } from '@/modules/api-keys/components/key-activity'
import { RevokedKeyRow } from '@/modules/api-keys/components/revoked-key-row'
import type { components } from '@/shared/api/api-schema'
import { PendingButton } from '@/shared/ui/pending-button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type MoreKeys = { hasMore: boolean; isLoading: boolean; onLoad: () => void }

/** The same widths as the active table, so both read column by column. */
const COLUMNS = [
  { label: 'Nome', width: 'w-[26%]' },
  { label: 'Tipo', width: 'w-24' },
  { label: 'Chave', width: 'w-[30%]' },
  { label: 'Criada', width: 'w-24' },
  { label: 'Último uso', width: 'w-24' },
  { label: 'Revogada', width: 'w-32' },
]

type RevokedKeysProps = { keys: ApiKeySummary[]; more: MoreKeys }

/** Keys that stopped working, kept for the record and closed by default. */
export function RevokedKeys({ keys, more }: RevokedKeysProps): JSX.Element | null {
  const revoked = keys.filter((key) => isRevokedKey(key))

  if (revoked.length === 0 && more.hasMore === false) {
    return null
  }

  return (
    <DisclosurePanel title="Revogadas" summary={revokedCount(revoked.length, more.hasMore)} isFlush>
      <Table className="min-w-[48rem] table-fixed">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label} className={column.width}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {revoked.map((apiKey) => (
            <RevokedKeyRow key={apiKey.id} apiKey={apiKey} />
          ))}
        </TableBody>
      </Table>
      <LoadMore more={more} />
    </DisclosurePanel>
  )
}

function revokedCount(count: number, hasMore: boolean): string {
  if (hasMore) {
    return `${count}+`
  }

  return String(count)
}

function LoadMore({ more }: { more: MoreKeys }): JSX.Element | null {
  if (more.hasMore === false) {
    return null
  }

  return (
    <div className="flex justify-center border-t border-border/60 p-2">
      <PendingButton
        type="button"
        variant="ghost"
        size="sm"
        isPending={more.isLoading}
        onClick={more.onLoad}
      >
        Carregar mais
      </PendingButton>
    </div>
  )
}
