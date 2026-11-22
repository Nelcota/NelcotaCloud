import type { JSX } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

/** The first block of a UUID is enough to tell users apart in a list; the copy carries all of it. */
const SHORT_LENGTH = 8

/** A user's id cut short in mono, with the full value on hover and a copy button. */
export function UserShortId({ id }: { id: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5">
      <code title={id} className="font-mono text-xs text-muted-foreground">
        {id.slice(0, SHORT_LENGTH)}
      </code>
      <CopyButton value={id} description="ID do usuário" isIconOnly />
    </span>
  )
}
