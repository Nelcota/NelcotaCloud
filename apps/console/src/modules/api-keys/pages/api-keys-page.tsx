import type { JSX } from 'react'

import { ApiKeysTable } from '@/modules/api-keys/components/api-keys-table'
import { CreateKeyDialog } from '@/modules/api-keys/components/create-key-dialog'
import { NewKeyNotice } from '@/modules/api-keys/components/new-key-notice'
import { SigningKeyCard } from '@/modules/api-keys/components/signing-key-card'
import { useApiKeysQuery, useCreateApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { showFlash } from '@/shared/lib/flash-notice'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
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
            <CreateKeyDialog
              kind="secret"
              isPrimary={false}
              isPending={creation.isPending}
              onCreate={(body) => creation.mutate(body, { onSuccess: announcePublishable })}
            />
            <CreateKeyDialog
              kind="publishable"
              isPrimary
              isPending={creation.isPending}
              onCreate={(body) => creation.mutate(body, { onSuccess: announcePublishable })}
            />
          </>
        }
      />
      <LoadError error={keys.error} onRetry={() => keys.refetch()} />
      <ErrorAlert error={creation.error} />
      <NewKeyNotice apiKey={creation.data} onDismiss={() => creation.reset()} />
      <ApiKeysTable projectId={projectId} keys={keys.data} hasFailed={keys.isError} />
      <SigningKeyCard projectId={projectId} />
    </div>
  )
}

/** A publishable key is not shown once: it lands in the list, which this sentence points to. */
function announcePublishable(created: components['schemas']['IssuedApiKey']): void {
  if (created.kind !== 'publishable') {
    return
  }

  showFlash('Publishable key criada. Copie-a na lista quando precisar.')
}
