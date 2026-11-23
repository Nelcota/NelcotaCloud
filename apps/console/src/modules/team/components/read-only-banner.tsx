import Eye from '~icons/solar/eye-linear'
import type { JSX } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'

/** Above every page of a project the account may only read, so no form is a surprise. */
export function ReadOnlyBanner({ isShown }: { isShown: boolean }): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <Alert role="status" className="mb-6">
      <Eye aria-hidden="true" />
      <AlertTitle>Você tem acesso só de leitura neste projeto.</AlertTitle>
      <AlertDescription>Peça a um dono para permitir edição.</AlertDescription>
    </Alert>
  )
}
