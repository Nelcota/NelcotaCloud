import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { apiUrl, checkApiHealth } from '@/lib/api'

export function HomePage() {
  const health = useQuery({ queryKey: ['api-health'], queryFn: checkApiHealth, retry: false })

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Console</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie projetos, usuários e provedores de login da sua conta NelcotaCloud.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <ApiStatus isPending={health.isPending} isError={health.isError} />
        <span className="text-muted-foreground font-mono text-xs">{apiUrl()}</span>
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
    </section>
  )
}

type ApiStatusProps = {
  isPending: boolean
  isError: boolean
}

function ApiStatus({ isPending, isError }: ApiStatusProps) {
  if (isPending) {
    return <span className="text-sm">Verificando a API…</span>
  }

  if (isError) {
    return <span className="text-destructive text-sm font-medium">API fora do ar</span>
  }

  return <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">API no ar</span>
}
