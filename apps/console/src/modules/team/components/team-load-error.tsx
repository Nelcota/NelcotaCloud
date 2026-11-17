import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

const ACCESS_LOST = 'project_access_denied'

type TeamLoadErrorProps = { error: Error | null; onRetry: () => void }

/** A failed load says why and offers the way out: try again, or leave a project you lost. */
export function TeamLoadError({ error, onRetry }: TeamLoadErrorProps): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <div className="grid gap-3">
      <ErrorAlert error={error} />
      <div className="flex flex-wrap gap-2">
        <NextStep error={error} onRetry={onRetry} />
      </div>
    </div>
  )
}

function NextStep({ error, onRetry }: { error: Error; onRetry: () => void }): JSX.Element {
  if (error instanceof ApiError && error.code === ACCESS_LOST) {
    return (
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        Ver meus projetos
      </Link>
    )
  }

  return (
    <Button variant="outline" onClick={onRetry}>
      Tentar de novo
    </Button>
  )
}
