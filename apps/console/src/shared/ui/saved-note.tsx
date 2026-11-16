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
    <p
      role="status"
      className="mr-auto flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
    >
      <CircleCheck className="size-4" strokeWidth={1.75} />
      {message}
    </p>
  )
}
