import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { describeError } from '@/shared/api/describe-error'
import { RouterLink } from '@/shared/routing/router-link'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

const ACCESS_LOST = 'project_access_denied'

type LoadErrorProps = { error: Error | null; onRetry: () => void }

/** A failed load says why and offers the way out: try again, or leave a project you lost. */
export function LoadError({ error, onRetry }: LoadErrorProps): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <Notice
      tone="error"
      title={describeError(error)}
      action={<NextStep error={error} onRetry={onRetry} />}
    />
  )
}

function NextStep({ error, onRetry }: { error: Error; onRetry: () => void }): JSX.Element {
  if (error instanceof ApiError && error.code === ACCESS_LOST) {
    return (
      <Button asChild variant="outline" size="sm">
        <RouterLink href="/">Ir para os projetos</RouterLink>
      </Button>
    )
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      Tentar de novo
    </Button>
  )
}
