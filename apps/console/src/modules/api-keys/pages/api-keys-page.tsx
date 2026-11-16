import { Plus } from 'lucide-react'
import type { JSX } from 'react'

import { ApiKeysTable } from '@/modules/api-keys/components/api-keys-table'
import { NewKeyNotice } from '@/modules/api-keys/components/new-key-notice'
import { SigningKeyCard } from '@/modules/api-keys/components/signing-key-card'
import { useApiKeysQuery, useCreateApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

export function ApiKeysPage(): JSX.Element {
  const projectId = useProjectId()
  const keys = useApiKeysQuery(projectId)
  const creation = useCreateApiKeyMutation(projectId)

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Chaves de API"
        description="A publishable vai no app; a secret fica só no seu servidor. Para trocar uma chave sem parar o app, crie a nova, publique o app com ela e só então revogue a antiga."
        actions={
          <>
            <Button
              variant="outline"
              disabled={creation.isPending}
              onClick={() => creation.mutate('publishable')}
            >
              <Plus strokeWidth={2} />
              Publishable key
            </Button>
            <Button disabled={creation.isPending} onClick={() => creation.mutate('secret')}>
              <Plus strokeWidth={2} />
              Secret key
            </Button>
          </>
        }
      />
      <ErrorAlert error={creation.error ?? keys.error} />
      <NewKeyNotice apiKey={creation.data} />
      <ApiKeysTable projectId={projectId} keys={keys.data} />
      <SigningKeyCard projectId={projectId} />
    </div>
  )
}
