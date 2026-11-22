import type { JSX } from 'react'

import { DisclosurePanel } from '@/modules/api-keys/components/disclosure-panel'
import { isRevokedKey } from '@/modules/api-keys/components/key-activity'
import { RevokedKeyRow } from '@/modules/api-keys/components/revoked-key-row'
import type { components } from '@/shared/api/api-schema'
import { PendingButton } from '@/shared/ui/pending-button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type MoreKeys = { hasMore: boolean; isLoading: boolean; onLoad: () => void }

const COLUMNS = ['Nome', 'Tipo', 'Chave', 'ID', 'Criada', 'Último uso', 'Revogada']

type RevokedKeysProps = { keys: ApiKeySummary[]; more: MoreKeys }

/** Keys that stopped working, kept for the record and closed by default. */
export function RevokedKeys({ keys, more }: RevokedKeysProps): JSX.Element | null {
  const revoked = keys.filter((key) => isRevokedKey(key))

  if (revoked.length === 0 && more.hasMore === false) {
    return null
  }

  return (
    <DisclosurePanel
      title="Chaves revogadas"
      summary={revokedCount(revoked.length, more.hasMore)}
      isFlush
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
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
    <div className="flex justify-center border-t p-3">
      <PendingButton
        type="button"
        variant="outline"
        isPending={more.isLoading}
        onClick={more.onLoad}
      >
        Carregar mais
      </PendingButton>
    </div>
  )
}
