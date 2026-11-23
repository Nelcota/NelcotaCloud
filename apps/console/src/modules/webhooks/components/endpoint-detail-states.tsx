import { SearchX, ArrowLeft } from 'lucide-react'
import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** The endpoint's page when it was deleted or the link is wrong. */
export function EndpointNotFound({ projectId }: { projectId: string }): JSX.Element {
  return (
    <>
      <h1 className="sr-only">Endpoint não encontrado</h1>
      <EmptyState
        isFramed
        icon={<SearchX aria-hidden />}
        title="Endpoint não encontrado"
        description="Ele foi excluído ou o link está errado."
        actions={
          <Button asChild size="sm">
            <RouterLink href={`/projects/${projectId}/webhooks`}>
              <ArrowLeft aria-hidden data-icon="inline-start" />
              Ver webhooks
            </RouterLink>
          </Button>
        }
      />
    </>
  )
}

type EndpointLoadingProps = { error: Error | null; onRetry: () => void }

/** The page's shape while the endpoint loads, or the failure with a way to try again. */
export function EndpointLoading({ error, onRetry }: EndpointLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Carregando endpoint</span>
      <Skeleton className="h-4 w-20" />
      <div className="grid gap-2">
        <Skeleton className="h-6 w-72 max-w-3/5" />
        <Skeleton className="h-5 w-96 max-w-4/5" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-11 w-full rounded-none" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
