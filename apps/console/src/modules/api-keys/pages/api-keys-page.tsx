import type { JSX } from 'react'

import { ApiKeysTable } from '@/modules/api-keys/components/api-keys-table'
import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { SigningKeyCard } from '@/modules/api-keys/components/signing-key-card'
import { useApiKeysQuery, useCreateApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'

export function ApiKeysPage(): JSX.Element {
  const projectId = useProjectId()
  const keys = useApiKeysQuery(projectId)
  const creation = useCreateApiKeyMutation(projectId)

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Chaves de API</CardTitle>
          <CardDescription>
            A publishable vai no app; a secret fica no seu servidor. Para trocar uma chave sem parar
            o app, crie a nova, publique o app com ela e só então revogue a antiga.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={creation.isPending}
              onClick={() => creation.mutate('publishable')}
            >
              Nova publishable key
            </Button>
            <Button
              variant="outline"
              disabled={creation.isPending}
              onClick={() => creation.mutate('secret')}
            >
              Nova secret key
            </Button>
          </div>
          <ErrorAlert error={creation.error ?? keys.error} />
          <NewKey apiKey={creation.data} />
          <ApiKeysTable projectId={projectId} keys={keys.data ?? []} />
        </CardContent>
      </Card>
      <SigningKeyCard projectId={projectId} />
    </div>
  )
}

function NewKey({
  apiKey,
}: {
  apiKey: { kind: string; key: string } | undefined
}): JSX.Element | null {
  if (apiKey === undefined) {
    return null
  }

  return <SecretReveal label={`Nova ${apiKey.kind} key (mostrada só agora)`} value={apiKey.key} />
}
