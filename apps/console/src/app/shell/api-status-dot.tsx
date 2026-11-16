import type { JSX } from 'react'

import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'
import { cn } from '@/shared/lib/class-names'

/** The API status as a small dot on the project tile; the words are kept for screen readers. */
export function ApiStatusDot(): JSX.Element {
  const health = useApiHealthQuery()

  return (
    <span
      className={cn(
        'ring-sidebar absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2',
        health.isPending && 'bg-muted-foreground',
        health.isError && 'bg-destructive',
        health.isSuccess && 'bg-emerald-500',
      )}
    >
      <span className="sr-only">{statusLabel(health.isPending, health.isError)}</span>
    </span>
  )
}

function statusLabel(isPending: boolean, isError: boolean): string {
  if (isPending) {
    return 'Verificando a API'
  }

  if (isError) {
    return 'API indisponível'
  }

  return 'API conectada'
}
