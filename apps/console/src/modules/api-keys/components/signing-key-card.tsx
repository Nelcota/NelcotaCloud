import Key from '~icons/solar/key-linear'
import type { JSX } from 'react'

import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SectionRow } from '@/shared/ui/section-row'

/**
 * The key that signs login tokens, as the page's last section and its risk zone: changing it
 * touches every login, so it sits apart from the everyday keys, in the console's danger tone
 * (a red hairline ring), with the consequence said beside the button that does it.
 */
export function SigningKeyCard({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  return (
    <SectionRow
      title="Chave de assinatura dos tokens"
      description="Assina os tokens de login dos seus usuários. Troque só se ela vazar."
    >
      <div className="surface ring-destructive/35 grid gap-4 p-5 ring-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground max-w-xl text-pretty">
            Os próximos tokens saem assinados por uma chave nova. Os que já foram emitidos continuam
            aceitos por 24 horas.
          </p>
          <div className="shrink-0">
            <ConfirmButton
              title="Trocar a chave de assinatura?"
              description="Os próximos tokens saem assinados por uma chave nova. A antiga continua aceita por 24 horas, para os tokens que já foram emitidos."
              confirmLabel="Trocar chave"
              change={{
                subject: 'Chave de assinatura atual',
                icon: Key,
                from: 'Assina tokens',
                to: 'Aceita por 24 horas',
              }}
              isPending={rotation.isPending}
              size="default"
              onConfirm={async () => {
                await rotation.mutateAsync()
              }}
            >
              Trocar chave
            </ConfirmButton>
          </div>
        </div>
        <RotatedKey keyId={rotation.data?.key_id} />
      </div>
    </SectionRow>
  )
}

/** Confirms the change in words; the key ID is there for whoever checks it in a token. */
function RotatedKey({ keyId }: { keyId: string | undefined }): JSX.Element | null {
  if (keyId === undefined) {
    return null
  }

  return (
    <p role="status" className="border-t pt-4 text-sm">
      Chave nova ativa. Os próximos tokens já saem assinados por ela.{' '}
      <span className="text-muted-foreground">
        ID da chave nova: <code className="font-mono text-xs break-all">{keyId}</code>
      </span>
    </p>
  )
}
