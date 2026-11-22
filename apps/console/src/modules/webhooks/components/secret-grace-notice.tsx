import type { JSX } from 'react'

import type { LastRotation } from '@/modules/webhooks/components/endpoint-panel-types'
import { formatDateTime } from '@/shared/lib/format-date'
import { Notice } from '@/shared/ui/notice'

/** How long the previous secret keeps signing after a rotation. */
const GRACE_MS = 86_400_000

type SecretGraceNoticeProps = { endpointId: string; lastRotation: LastRotation | null }

/** After a rotation in this visit: until when the old secret still signs beside the new one. */
export function SecretGraceNotice({
  endpointId,
  lastRotation,
}: SecretGraceNoticeProps): JSX.Element | null {
  if (lastRotation === null || lastRotation.endpointId !== endpointId) {
    return null
  }

  const until = new Date(lastRotation.rotatedAt + GRACE_MS).toISOString()

  return (
    <Notice
      tone="info"
      title={`O segredo anterior assina junto com o novo até ${formatDateTime(until)}.`}
    />
  )
}
