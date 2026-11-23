import { CloudOff as CloudCross, RotateCw } from 'lucide-react'
import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PendingButton } from '@/shared/ui/pending-button'

const STORAGE_UNAVAILABLE = 'storage_unavailable'
const STORAGE_NOT_CONFIGURED = 'storage_not_configured'

type StorageLoadFailureProps = { error: Error; isRetrying: boolean; onRetry: () => void }

/** The buckets could not be read: storage off or down gets its own panel, anything else the strip. */
export function StorageLoadFailure({
  error,
  isRetrying,
  onRetry,
}: StorageLoadFailureProps): JSX.Element {
  if (error instanceof ApiError && error.code === STORAGE_NOT_CONFIGURED) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <EmptyState
          icon={<CloudCross aria-hidden />}
          title="Arquivos não ativados neste servidor"
          description="O servidor roda sem armazenamento. Quem administra a plataforma ativa com as variáveis STORAGE_R2_* (bucket R2 da Cloudflare)."
        />
      </div>
    )
  }

  if (error instanceof ApiError && error.code === STORAGE_UNAVAILABLE) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <EmptyState
          icon={<CloudCross aria-hidden />}
          title="Armazenamento indisponível"
          description="O serviço de arquivos não respondeu. Costuma voltar em instantes."
          actions={
            <PendingButton type="button" variant="outline" isPending={isRetrying} onClick={onRetry}>
              <RotateCw aria-hidden data-icon="inline-start" />
              Tentar de novo
            </PendingButton>
          }
        />
      </div>
    )
  }

  return <LoadError error={error} onRetry={onRetry} />
}
