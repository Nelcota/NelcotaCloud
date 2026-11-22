import { KeyRound as Key, RefreshCw as Refresh } from 'lucide-react'
import type { JSX } from 'react'

import { JWKS_URL, TOKEN_ISSUER } from '@/modules/api-keys/components/project-endpoints'
import { SigningKeyFacts } from '@/modules/api-keys/components/signing-key-facts'
import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { Notice } from '@/shared/ui/notice'
import { SettingsSection } from '@/shared/ui/settings-section'

/** The key that signs the access tokens of the project: where to verify them, and rotation. */
export function SigningKeySection({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  async function rotate(): Promise<void> {
    await rotation.mutateAsync()
  }

  return (
    <SettingsSection
      title="Chave de assinatura"
      description="Assina os tokens de acesso. Servidores verificam pelo JWKS."
      footer={
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
      }
    >
      <RotatedKey keyId={rotation.data?.key_id} onDismiss={() => rotation.reset()} />
      <SigningKeyFacts projectId={projectId} facts={{ jwksUrl: JWKS_URL, issuer: TOKEN_ISSUER }} />
    </SettingsSection>
  )
}

type RotatedKeyProps = { keyId: string | undefined; onDismiss: () => void }

function RotatedKey({ keyId, onDismiss }: RotatedKeyProps): JSX.Element | null {
  if (keyId === undefined) {
    return null
  }

  return (
    <Notice tone="success" title="Chave nova ativa" onDismiss={onDismiss}>
      <span className="flex min-w-0 items-baseline gap-1.5">
        kid
        <code className="min-w-0 font-mono text-foreground wrap-anywhere">{keyId}</code>
      </span>
    </Notice>
  )
}
