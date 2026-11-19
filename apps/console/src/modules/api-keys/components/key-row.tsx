import type { JSX } from 'react'

import { KeyActionsMenu } from '@/modules/api-keys/components/key-actions-menu'
import {
  DateCell,
  NameCell,
  RelativeDate,
  StandInDates,
  ValueCell,
} from '@/modules/api-keys/components/key-cells'
import { KeyLastUse } from '@/modules/api-keys/components/key-last-use'
import { type KeyStage, KeyStageTag } from '@/modules/api-keys/components/key-tags'
import {
  type KeyRevocation,
  RevokeKeyAction,
} from '@/modules/api-keys/components/revoke-key-action'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { TableCell, TableRow } from '@/shared/ui/table'
import { CELL_X } from '@/shared/ui/table-styles'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** Where the key stands in a rotation, and how to start one. */
export type KeyRotation = {
  stage: KeyStage
  isReplacing: boolean
  onReplace: () => Promise<void>
}

type KeyRowProps = {
  apiKey: ApiKeySummary
  revocation: KeyRevocation
  rotation: KeyRotation
}

/** One active key: name, the key, when it was made and last used, then its actions. */
export function KeyRow({ apiKey, revocation, rotation }: KeyRowProps): JSX.Element {
  return (
    <TableRow>
      <NameCell
        apiKey={apiKey}
        tag={
          <>
            <KeyStageTag stage={rotation.stage} />
            <PendingRevoke apiKey={apiKey} revocation={revocation} stage={rotation.stage} />
          </>
        }
        dates={<StandInDates apiKey={apiKey} />}
      />
      <ValueCell apiKey={apiKey} />
      <DateCell>
        <KeyLastUse lastUsedAt={apiKey.last_used_at} isBare />
      </DateCell>
      <DateCell>
        <RelativeDate at={apiKey.created_at} />
      </DateCell>
      {/* 8px above and below the 32px button make the same 48px row as 12px around a text line. */}
      <TableCell className={cn(CELL_X, 'py-2 align-top whitespace-nowrap')}>
        <div className="flex justify-end">
          <KeyActionsMenu
            apiKey={apiKey}
            revocation={revocation}
            isReplacing={rotation.isReplacing}
            onReplace={rotation.onReplace}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

type PendingRevokeProps = { apiKey: ApiKeySummary; revocation: KeyRevocation; stage: KeyStage }

/**
 * Once a replacement exists, revoking the old key is the next step, so it comes out of the menu
 * and sits by the name, beside the tag that asks for it.
 */
function PendingRevoke({ apiKey, revocation, stage }: PendingRevokeProps): JSX.Element | null {
  if (stage !== 'to-revoke') {
    return null
  }

  return <RevokeKeyAction apiKey={apiKey} {...revocation} />
}
