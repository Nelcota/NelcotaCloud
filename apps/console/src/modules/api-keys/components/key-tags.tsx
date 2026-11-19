import type { JSX } from 'react'

import { Badge } from '@/shared/ui/badge'

/** Where a key stands in a rotation, when it is in one. */
export type KeyStage = 'new' | 'to-revoke' | 'steady'

/** Only the rotation states, since they change what to do next with the key. */
export function KeyStageTag({ stage }: { stage: KeyStage }): JSX.Element | null {
  if (stage === 'new') {
    return <Badge variant="success">Nova</Badge>
  }

  if (stage === 'to-revoke') {
    return <Badge variant="warning">Revogue após publicar a nova</Badge>
  }

  return null
}
