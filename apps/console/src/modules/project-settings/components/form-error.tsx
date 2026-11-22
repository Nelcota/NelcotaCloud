import type { JSX } from 'react'

import { ErrorAlert } from '@/shared/ui/error-alert'

/** A refusal as one more row of the group, next to the fields it is about. */
export function FormError({ error }: { error: Error | null }): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <div className="px-6 py-5">
      <ErrorAlert error={error} />
    </div>
  )
}
