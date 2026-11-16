import type { JSX } from 'react'

import { useRotateSigningKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'

export function SigningKeyCard({ projectId }: { projectId: string }): JSX.Element {
  const rotation = useRotateSigningKeyMutation(projectId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chave de assinatura dos tokens</CardTitle>
        <CardDescription>
          Rotacione se suspeitar de vazamento. Tokens já emitidos continuam válidos até expirarem;
          os novos usam a chave nova (publicada no JWKS).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <ConfirmButton
            title="Rotacionar a chave de assinatura?"
            description="Os próximos tokens serão assinados por uma chave nova."
            confirmLabel="Rotacionar"
            isPending={rotation.isPending}
            onConfirm={() => rotation.mutate()}
          >
            Rotacionar chave
          </ConfirmButton>
        </div>
        <ErrorAlert error={rotation.error} />
        <RotatedKey keyId={rotation.data?.key_id} />
      </CardContent>
    </Card>
  )
}

function RotatedKey({ keyId }: { keyId: string | undefined }): JSX.Element | null {
  if (keyId === undefined) {
    return null
  }

  return (
    <p className="text-sm">
      Nova chave ativa: <code className="font-mono text-xs">{keyId}</code>
    </p>
  )
}
