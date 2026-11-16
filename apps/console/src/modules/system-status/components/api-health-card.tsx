import type { JSX } from 'react'

import { ApiHealthLabel } from '@/modules/system-status/components/api-health-label'
import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { Button } from '@/shared/ui/button'

export function ApiHealthCard(): JSX.Element {
  const health = useApiHealthQuery()

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <ApiHealthLabel isPending={health.isPending} isError={health.isError} />
      <span className="text-muted-foreground font-mono text-xs">{API_BASE_URL}</span>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        aria-busy={health.isFetching}
        onClick={() => health.refetch()}
      >
        Verificar de novo
      </Button>
    </div>
  )
}
