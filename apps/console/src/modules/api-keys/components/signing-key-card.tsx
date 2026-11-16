import RefreshCw from '~icons/solar/refresh-linear'
import type { JSX } from 'react'

import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'

export function SigningKeyCard({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  return (
    <section className="bg-card grid gap-4 rounded-xl border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="text-muted-foreground size-5" />
          </span>
          <div>
            <h2 className="text-sm">Chave de assinatura dos tokens</h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm text-pretty">
              Rotacione se suspeitar de vazamento. Tokens já emitidos valem até expirar; os novos
              usam a chave nova, publicada no JWKS.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ConfirmButton
            title="Rotacionar a chave de assinatura?"
            description="Os próximos tokens serão assinados por uma chave nova. A antiga continua no JWKS por um dia."
            confirmLabel="Rotacionar"
            isPending={rotation.isPending}
            onConfirm={() => rotation.mutate()}
          >
            Rotacionar chave
          </ConfirmButton>
        </div>
      </div>
      <ErrorAlert error={rotation.error} />
      <RotatedKey keyId={rotation.data?.key_id} />
    </section>
  )
}

/** Confirms the rotation in words; the raw key ID means nothing to most readers. */
function RotatedKey({ keyId }: { keyId: string | undefined }): JSX.Element | null {
  if (keyId === undefined) {
    return null
  }

  return (
    <p role="status" className="text-sm">
      Chave nova ativa. Os próximos tokens já saem assinados por ela.{' '}
      <span className="text-muted-foreground">
        ID no JWKS: <code className="font-mono text-xs break-all">{keyId}</code>
      </span>
    </p>
  )
}
