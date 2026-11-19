import type { JSX } from 'react'
import { useState } from 'react'

import { CacheCredentialNotice } from '@/modules/cache/components/cache-credential-notice'
import { CacheCredentialsSection } from '@/modules/cache/components/cache-credentials-section'
import { CacheSettingsSection } from '@/modules/cache/components/cache-settings-section'
import { useProjectCacheQuery } from '@/modules/cache/queries/use-project-cache'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

export function ProjectCacheScreen({ projectId }: { projectId: string }): JSX.Element {
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const cache = useProjectCacheQuery(projectId)
  const settings = cache.data

  return (
    <>
      {issuedToken !== null && (
        <CacheCredentialNotice token={issuedToken} onDismiss={() => setIssuedToken(null)} />
      )}
      <LoadError error={cache.error} onRetry={() => cache.refetch()} />
      {cache.isPending && (
        <Skeleton className="surface h-32" aria-label="Carregando cache" aria-busy="true" />
      )}
      {settings !== undefined && cache.isError === false && (
        <>
          <CacheSettingsSection
            projectId={projectId}
            enabled={settings.enabled}
            configured={settings.configured}
          />
          <CacheCredentialsSection
            projectId={projectId}
            canCreate={settings.enabled && settings.configured && issuedToken === null}
            credentials={settings.credentials}
            onIssued={setIssuedToken}
          />
        </>
      )}
    </>
  )
}
