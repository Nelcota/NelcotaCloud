import type { JSX } from 'react'

import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'
import { cn } from '@/shared/lib/class-names'

/** Whether the console reaches the API; the dot marks that real state, it does not pulse. */
export function ApiStatus(): JSX.Element {
  const health = useApiHealthQuery()
  const label = statusLabel(health.isPending, health.isError)

  return (
    <button
      type="button"
      onClick={() => health.refetch()}
      aria-busy={health.isFetching}
      title="Verificar de novo"
      aria-label={`${label}. Verificar de novo`}
      className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full',
          health.isPending && 'bg-muted-foreground',
          health.isError && 'bg-destructive',
          health.isSuccess && 'bg-emerald-500',
        )}
      />
      {label}
    </button>
  )
}

function statusLabel(isPending: boolean, isError: boolean): string {
  if (isPending) {
    return 'Verificando a API…'
  }

  if (isError) {
    return 'API indisponível'
  }

  return 'API conectada'
}
