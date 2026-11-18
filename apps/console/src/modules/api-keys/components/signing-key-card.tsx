import Key from '~icons/solar/key-linear'
import RefreshCw from '~icons/solar/refresh-linear'
import type { JSX } from 'react'

import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ConfirmButton } from '@/shared/ui/confirm-button'

export function SigningKeyCard({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  return (
    <section className="bg-card grid gap-4 rounded-xl border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <RefreshCw aria-hidden="true" className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="text-base">Chave de assinatura dos tokens</h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm text-pretty">
              Rotacione se suspeitar de vazamento. Tokens já emitidos valem até expirar; os novos
              usam a chave nova, publicada no JWKS.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ConfirmButton
            title="Rotacionar a chave de assinatura?"
            description="Os próximos tokens serão assinados por uma chave nova. A antiga continua no JWKS por 24 horas."
            confirmLabel="Rotacionar"
            change={{
              subject: 'Chave de assinatura atual',
              icon: Key,
              from: 'Assina tokens',
              to: 'Só no JWKS por 24 horas',
            }}
            isPending={rotation.isPending}
            onConfirm={async () => {
              await rotation.mutateAsync()
            }}
          >
            Rotacionar chave
          </ConfirmButton>
        </div>
      </div>
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
