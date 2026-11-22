import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

/** Enough of an id to match it in the server's logs by eye; the copy carries all of it. */
const SHORT_LENGTH = 8

/** The request's id, cut short in mono, with a copy button. */
export function RequestIdCell({ requestId }: { requestId: string | null }): JSX.Element {
  if (requestId === null || requestId === '') {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <code title={requestId} className="font-mono text-xs text-muted-foreground">
        {requestId.slice(0, SHORT_LENGTH)}
      </code>
      <CopyButton value={requestId} description="ID da requisição" isIconOnly />
    </span>
  )
}
