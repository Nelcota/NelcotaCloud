import SearchX from '~icons/solar/magnifier-close-linear'
import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** The user's page when the account no longer exists or the link is wrong. */
export function UserNotFound({ projectId }: { projectId: string }): JSX.Element {
  return (
    <>
      <h1 className="sr-only">Usuário não encontrado</h1>
      <EmptyState
        isFramed
        icon={<SearchX aria-hidden />}
        title="Usuário não encontrado"
        description="A conta foi excluída ou o link está errado."
        actions={
          <Button asChild size="sm">
            <RouterLink href={`/projects/${projectId}/users`}>Ver usuários</RouterLink>
          </Button>
        }
      />
    </>
  )
}

type UserLoadingProps = { error: Error | null; onRetry: () => void }

/** The page's shape while the user loads, or the failure with a way to try again. */
export function UserLoading({ error, onRetry }: UserLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div aria-busy="true" aria-label="Carregando usuário" className="flex flex-col gap-6">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}
