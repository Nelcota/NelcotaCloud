import type { JSX } from 'react'

import { KeyLastUsed } from '@/modules/api-keys/components/key-last-used'
import { KeyName } from '@/modules/api-keys/components/key-name'
import { KeyValue } from '@/modules/api-keys/components/key-value'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const KIND_NAMES: Record<string, string> = { publishable: 'Publicável', secret: 'Secreta' }

/** A revoked key, for the record: what it was and when it stopped working. */
export function RevokedKeyRow({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  return (
    <TableRow className="text-muted-foreground">
      <TableCell>
        <KeyName apiKey={apiKey} />
      </TableCell>
      <TableCell>{KIND_NAMES[apiKey.kind] ?? apiKey.kind}</TableCell>
      <TableCell>
        <KeyValue apiKey={apiKey} isRevoked />
      </TableCell>
      <TableCell>
        <IdChip label="ID da chave" value={apiKey.id} className="max-w-28" />
      </TableCell>
      <TableCell>
        <Timestamp value={apiKey.created_at} format="date" />
      </TableCell>
      <TableCell>
        <KeyLastUsed lastUsedAt={apiKey.last_used_at} />
      </TableCell>
      <TableCell>
        <RevokedAt value={apiKey.revoked_at} />
      </TableCell>
    </TableRow>
  )
}

function RevokedAt({ value }: { value: string | null | undefined }): JSX.Element {
  if (value === null || value === undefined) {
    return <span>—</span>
  }

  return <Timestamp value={value} format="date_time" />
}
