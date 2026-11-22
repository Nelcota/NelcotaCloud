import Key from '~icons/solar/key-linear'
import Refresh from '~icons/solar/refresh-linear'
import type { JSX } from 'react'

import {
  JWKS_URL,
  SIGNING_ALGORITHM,
  TOKEN_ISSUER,
} from '@/modules/api-keys/components/project-endpoints'
import { SigningKeyFacts } from '@/modules/api-keys/components/signing-key-facts'
import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { IdChip } from '@/shared/ui/id-chip'
import { Notice } from '@/shared/ui/notice'
import { Section } from '@/shared/ui/section'

/** The key that signs the project's access tokens: where to verify them, and rotation. */
export function SigningKeySection({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  async function rotate(): Promise<void> {
    await rotation.mutateAsync()
  }

  return (
    <Section title="Chave de assinatura" description={`Tokens de acesso ${SIGNING_ALGORITHM}.`}>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
        <RotatedKey keyId={rotation.data?.key_id} onDismiss={() => rotation.reset()} />
        <SigningKeyFacts
          projectId={projectId}
          facts={{ jwksUrl: JWKS_URL, issuer: TOKEN_ISSUER }}
        />
        <p className="text-sm text-muted-foreground">
          Ao rotacionar, a chave antiga fica no JWKS por 24 horas (no máximo 5 aposentadas) e depois
          para de verificar tokens.
        </p>
        <div>
          <ConfirmButton
            label="Rotacionar chave"
            icon={Refresh}
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
            onConfirm={rotate}
          />
        </div>
      </div>
    </Section>
  )
}

type RotatedKeyProps = { keyId: string | undefined; onDismiss: () => void }

function RotatedKey({ keyId, onDismiss }: RotatedKeyProps): JSX.Element | null {
  if (keyId === undefined) {
    return null
  }

  return (
    <Notice tone="success" title="Chave nova ativa" onDismiss={onDismiss}>
      <IdChip label="kid" value={keyId} isLabelVisible className="mt-1" />
    </Notice>
  )
}
