import DangerTriangle from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Alert, AlertTitle } from '@/shared/ui/alert'
import { CopyableValue } from '@/shared/ui/copyable-value'

type NewConnectionPasswordView = components['schemas']['NewConnectionPassword']

/** The password and the URL with it, right after they were generated: the only time they exist here. */
export function NewConnectionPassword({
  issued,
}: {
  issued: NewConnectionPasswordView | null
}): JSX.Element | null {
  if (issued === null) {
    return null
  }

  return (
    <div className="grid gap-4">
      <Alert className="border-amber-500/40 bg-amber-500/10">
        <DangerTriangle aria-hidden="true" className="text-amber-700 dark:text-amber-400" />
        <AlertTitle>Guarde agora: a senha não aparece de novo.</AlertTitle>
      </Alert>
      <CopyableValue label="URL de conexão" value={issued.connection_string} autoFocusCopy />
      <CopyableValue label="Senha" value={issued.password} />
    </div>
  )
}
