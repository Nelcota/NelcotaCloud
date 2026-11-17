import type { JSX } from 'react'

import { describeError } from '@/shared/api/describe-error'
import { Alert, AlertDescription } from '@/shared/ui/alert'

/** Shows an API or SDK error in Portuguese; nothing when there is no error. */
export function ErrorAlert({ error }: { error: unknown }): JSX.Element | null {
  if (error === null || error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{describeError(error)}</AlertDescription>
    </Alert>
  )
}
