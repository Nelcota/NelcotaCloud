import type { JSX } from 'react'

import { SiteUrl } from '@/modules/overview/components/site-url'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { IdChip } from '@/shared/ui/id-chip'

type FactsBarProps = { projectId: string; siteUrl: string | undefined }

/** The values a developer copies most: the project's id, the API address and the app's site. */
export function FactsBar({ projectId, siteUrl }: FactsBarProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <IdChip label="ID do projeto" value={projectId} isLabelVisible />
      <IdChip label="URL da API" value={API_BASE_URL} isLabelVisible />
      <SiteUrl url={siteUrl} />
    </div>
  )
}
