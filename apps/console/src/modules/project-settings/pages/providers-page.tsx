import type { JSX } from 'react'

import { OAuthRedirectsPanel } from '@/modules/project-settings/components/oauth-redirects-panel'
import { providersApiSnippets } from '@/modules/project-settings/components/providers-api-snippets'
import { ProvidersTable } from '@/modules/project-settings/components/providers-table'
import { useOAuthSettingsQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import { usePublishableKey } from '@/modules/project-settings/queries/use-publishable-key'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { IdChip } from '@/shared/ui/id-chip'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type ConfiguredProviders = components['schemas']['ConfiguredProviders']

const AUTHORIZE_URL = `${API_BASE_URL}/auth/v1/oauth/{provider}/authorize`

export function ProvidersPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useOAuthSettingsQuery(projectId)
  const publishableKey = usePublishableKey(projectId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Login social"
        description="Google e GitHub com o app OAuth do próprio projeto, sempre com PKCE."
        actions={
          <ApiSheet
            title="Login social pela API"
            description="Abra o provedor e troque o code de volta pela sessão."
            snippets={providersApiSnippets(publishableKey)}
          />
        }
      >
        <div className="flex flex-wrap gap-2">
          <IdChip label="Authorize" value={AUTHORIZE_URL} isLabelVisible />
          <IdChip label="Token" value={`${API_BASE_URL}/auth/v1/oauth/token`} isLabelVisible />
        </div>
      </PageHeader>
      <LoadError error={settings.error} onRetry={() => settings.refetch()} />
      <ProvidersBody
        projectId={projectId}
        configured={settings.data}
        hasFailed={settings.isError}
      />
    </div>
  )
}

type ProvidersBodyProps = {
  projectId: string
  /** `undefined` while loading. */
  configured: ConfiguredProviders | undefined
  hasFailed: boolean
}

function ProvidersBody({
  projectId,
  configured,
  hasFailed,
}: ProvidersBodyProps): JSX.Element | null {
  if (configured === undefined && hasFailed) {
    return null
  }

  if (configured === undefined) {
    return <Skeleton className="h-48 rounded-xl" />
  }

  return (
    <>
      <ProvidersTable projectId={projectId} configured={configured} />
      <OAuthRedirectsPanel key={projectId} projectId={projectId} urls={configured.redirect_urls} />
    </>
  )
}
