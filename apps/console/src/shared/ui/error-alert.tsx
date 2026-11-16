import type { JSX } from 'react'

import { Alert, AlertDescription } from '@/shared/ui/alert'

const FALLBACK_MESSAGE = 'Algo deu errado. Tente de novo.'

/** Shows an API or SDK error message; nothing when there is no error. */
export function ErrorAlert({ error }: { error: unknown }): JSX.Element | null {
  if (error === null || error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{messageOf(error)}</AlertDescription>
    </Alert>
  )
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return FALLBACK_MESSAGE
}
