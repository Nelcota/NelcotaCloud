import type { JSX } from 'react'

/** The field's validation problem in words, under it; nothing while the value is fine. */
export function FieldErrorText({
  id,
  message,
}: {
  id: string
  message: string
}): JSX.Element | null {
  if (message === '') {
    return null
  }

  return (
    <p id={id} className="text-destructive text-sm">
      {message}
    </p>
  )
}
