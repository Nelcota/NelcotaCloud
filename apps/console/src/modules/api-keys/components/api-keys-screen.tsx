import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ApiKeyList } from '@/modules/api-keys/components/api-key-list'
import { CreateKeyDialog } from '@/modules/api-keys/components/create-key-dialog'
import { activeKeys } from '@/modules/api-keys/components/key-activity'
import { SigningKeyCard } from '@/modules/api-keys/components/signing-key-card'
import { useKeyRotation } from '@/modules/api-keys/components/use-key-rotation'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

/**
 * The keys page: one create button for both kinds in the header, since creating and replacing
 * share the state that marks a new key and the old one to revoke.
 */
export function ApiKeysScreen({ projectId }: { projectId: string }): JSX.Element {
  const keys = useApiKeysQuery(projectId)
  const rotation = useKeyRotation(projectId, activeKeys(keys.data ?? []))

  return (
    <div data-wide-page className="@container mx-auto grid w-full max-w-7xl gap-12">
      <PageHeader
        title="Chaves de API"
        description={<HeaderDescription projectId={projectId} />}
        actions={<CreateKeyDialog isPending={rotation.isCreating} onCreate={rotation.create} />}
      />
      <LoadError error={keys.error} onRetry={() => keys.refetch()} />
      {/*
        Spacing by level: 48px under the page header, 32px between sections, 24px inside one.
        A bigger gap marks a bigger break, so the eye groups what belongs together.
      */}
      <div className="grid gap-8">
        <ApiKeyList keys={keys.data} hasFailed={keys.isError} rotation={rotation} />
        <SigningKeyCard projectId={projectId} />
      </div>
    </div>
  )
}

/** What the keys are for, and where the steps to use them in code live (the overview). */
function HeaderDescription({ projectId }: { projectId: string }): JSX.Element {
  return (
    <>
      Conectam seu app e seu servidor a este projeto.{' '}
      <Link
        to="/projects/$projectId"
        params={{ projectId }}
        className="text-primary-ink rounded-sm underline-offset-4 hover:underline"
      >
        Ver como conectar
      </Link>
    </>
  )
}
