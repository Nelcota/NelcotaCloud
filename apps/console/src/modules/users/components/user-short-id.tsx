import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import { CopyButton } from '@/shared/ui/copy-button'

/** The first block of a UUID is enough to tell records apart; the copy carries all of it. */
const SHORT_LENGTH = 8

type UserShortIdProps = {
  id: string
  /** What the copied value is, for the copy button ("ID da sessão"). */
  description?: string
  className?: string
}

/** An id cut short in mono, with the full value on hover and a copy button. */
export function UserShortId({ id, description, className }: UserShortIdProps): JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <code title={id} className="font-mono text-xs text-muted-foreground">
        {id.slice(0, SHORT_LENGTH)}
      </code>
      <CopyButton value={id} description={description ?? 'ID do usuário'} isIconOnly />
    </span>
  )
}
