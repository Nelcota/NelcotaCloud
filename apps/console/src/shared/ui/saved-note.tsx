import { CircleCheck } from 'lucide-react'
import type { JSX } from 'react'

/** Confirms that a form was saved, next to its Save button. */
export function SavedNote({
  isSaved,
  message,
}: {
  isSaved: boolean
  message: string
}): JSX.Element | null {
  if (isSaved === false) {
    return null
  }

  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleCheck aria-hidden className="size-3.5 text-success" />
      {message}
    </span>
  )
}
