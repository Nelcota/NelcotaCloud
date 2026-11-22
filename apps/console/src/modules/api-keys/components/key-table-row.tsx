import type { JSX } from 'react'

import { KeyKindBadge } from '@/modules/api-keys/components/key-kind-badge'
import { KeyLastUsed } from '@/modules/api-keys/components/key-last-used'
import { KeyName } from '@/modules/api-keys/components/key-name'
import type { KeyRevocation } from '@/modules/api-keys/components/key-revocation'
import { KeyValue } from '@/modules/api-keys/components/key-value'
import { RevokeKeyAction } from '@/modules/api-keys/components/revoke-key-action'
import type { components } from '@/shared/api/api-schema'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type KeyTableRowProps = {
  apiKey: ApiKeySummary
  /** Active keys of the same kind, this one included. */
  activeCount: number
  revocation: KeyRevocation
}

/** One active key with every field the API reports and its revoke menu. */
export function KeyTableRow({ apiKey, activeCount, revocation }: KeyTableRowProps): JSX.Element {
  return (
    <TableRow>
      <TableCell>
        <KeyName apiKey={apiKey} />
      </TableCell>
      <TableCell>
        <KeyKindBadge kind={apiKey.kind} />
      </TableCell>
      <TableCell>
        <KeyValue apiKey={apiKey} isRevoked={false} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Timestamp value={apiKey.created_at} format="relative" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <KeyLastUsed lastUsedAt={apiKey.last_used_at} />
      </TableCell>
      <TableCell>
        <StatusBadge tone="success">Ativa</StatusBadge>
      </TableCell>
      <TableCell className="text-right">
        <RevokeKeyAction
          apiKey={apiKey}
          activeOfKind={activeCount}
          isPending={revocation.isPending && revocation.keyId === apiKey.id}
          onRevoke={() => revocation.onRevoke(apiKey.id)}
        />
      </TableCell>
    </TableRow>
  )
}
