import CloudCross from '~icons/solar/cloud-cross-linear'
import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PendingButton } from '@/shared/ui/pending-button'

const STORAGE_UNAVAILABLE = 'storage_unavailable'

type StorageLoadFailureProps = { error: Error; isRetrying: boolean; onRetry: () => void }

/** The buckets could not be read: storage being down gets its own framed panel, anything else the strip. */
export function StorageLoadFailure({
  error,
  isRetrying,
  onRetry,
}: StorageLoadFailureProps): JSX.Element {
  if (error instanceof ApiError && error.code === STORAGE_UNAVAILABLE) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<CloudCross aria-hidden />}
          title="Armazenamento indisponível"
          description="Não dá para criar buckets nem enviar arquivos até ele voltar."
          actions={
            <PendingButton type="button" variant="outline" isPending={isRetrying} onClick={onRetry}>
              Tentar de novo
            </PendingButton>
          }
        />
      </div>
    )
  }

  return <LoadError error={error} onRetry={onRetry} />
}
