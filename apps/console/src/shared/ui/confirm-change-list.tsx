import type { JSX } from 'react'

import { ConfirmChangePreview, type ConfirmChange } from '@/shared/ui/confirm-change'
import { changesOf } from '@/shared/ui/confirm-dialog-rules'

/** What a confirmation changes, each row going from its current state to the new one. */
export function ConfirmChangeList({
  change,
}: {
  change: ConfirmChange | ConfirmChange[] | undefined
}): JSX.Element | null {
  const changes = changesOf(change)

  if (changes.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {changes.map((item) => (
        <ConfirmChangePreview key={item.subject} change={item} />
      ))}
    </div>
  )
}
