import type { JSX } from 'react'

import { ConnectAppPanel } from '@/modules/api-keys/components/connect-app-panel'
import { CreateKeyDialog } from '@/modules/api-keys/components/create-key-dialog'
import { keyApiSnippets } from '@/modules/api-keys/components/key-api-snippets'
import { firstVisiblePublishable } from '@/modules/api-keys/components/key-activity'
import { KeyFacts } from '@/modules/api-keys/components/key-facts'
import { KeyLists } from '@/modules/api-keys/components/key-lists'
import { NewKeyNotice } from '@/modules/api-keys/components/new-key-notice'
import { SigningKeySection } from '@/modules/api-keys/components/signing-key-section'
import {
  useApiKeysHistoryQuery,
  useCreateApiKeyMutation,
} from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

export function ApiKeysPage(): JSX.Element {
  const projectId = useProjectId()

  return <ProjectKeys key={projectId} projectId={projectId} />
}

function ProjectKeys({ projectId }: { projectId: string }): JSX.Element {
  const keys = useApiKeysHistoryQuery(projectId)
  const creation = useCreateApiKeyMutation(projectId)
  const publishableKey = firstVisiblePublishable(keys.data)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chaves de API"
        description="Identificam o projeto em cada requisição, no header apikey."
        actions={
          <>
            <ApiSheet title="Chaves pela API" snippets={keyApiSnippets(publishableKey)} />
            <CreateKeyDialog
              isPending={creation.isPending}
              isDisabled={creation.data?.kind === 'secret'}
              onCreate={async (body) => {
                announcePublishable(await creation.mutateAsync(body))
              }}
            />
          </>
        }
      >
        <KeyFacts projectId={projectId} />
      </PageHeader>
      <NewKeyNotice apiKey={creation.data} onDismiss={() => creation.reset()} />
      <LoadError error={keys.error} onRetry={() => keys.refetch()} />
      <KeyLists
        projectId={projectId}
        keys={keys.data}
        hasFailed={keys.isError}
        more={{
          hasMore: keys.hasNextPage,
          isLoading: keys.isFetchingNextPage,
          onLoad: () => void keys.fetchNextPage(),
        }}
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ConnectAppPanel publishableKey={publishableKey} projectId={projectId} />
        <SigningKeySection projectId={projectId} />
      </div>
    </div>
  )
}

/** A publishable key is not shown once: it lands in its table, in full. */
function announcePublishable(created: components['schemas']['IssuedApiKey']): void {
  if (created.kind !== 'publishable') {
    return
  }

  showFlash('Chave publicável criada.')
}
