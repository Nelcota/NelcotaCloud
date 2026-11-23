import type { JSX } from 'react'

type MissingNoteProps = {
  /** Referenced by the waiting button's `aria-describedby`, so screen readers hear why. */
  id: string
  missing: string | null
}

/** Beside a dialog's disabled button: what is still missing before it can be pressed. */
export function MissingNote({ id, missing }: MissingNoteProps): JSX.Element | null {
  if (missing === null) {
    return null
  }

  return (
    <span id={id} className="order-last text-xs text-muted-foreground sm:order-none sm:me-auto">
      {missing}
    </span>
  )
}
