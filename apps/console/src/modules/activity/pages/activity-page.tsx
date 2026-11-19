import { useNavigate, useSearch } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import { ActivityFeed } from '@/modules/activity/components/activity-feed'
import { ActivitySummary } from '@/modules/activity/components/activity-summary'
import { ActivityToolbar } from '@/modules/activity/components/activity-toolbar'
import { ExportActivityButton } from '@/modules/activity/components/export-activity-button'
import {
  type ActivityFilter,
  activityFilterOf,
  searchForFilter,
} from '@/modules/activity/model/activity-search'
import { useExportActivity } from '@/modules/activity/queries/use-export-activity'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

const ROUTE_ID = '/_authenticated/projects/$projectId/activity'
const ROUTE_PATH = '/projects/$projectId/activity'

export function ActivityPage(): JSX.Element {
  const projectId = useProjectId()
  const urlFilter = activityFilterOf(useSearch({ from: ROUTE_ID }))
  // The field keeps its own text: the URL updates a moment later and would move the cursor.
  const [typedSearch, setTypedSearch] = useState(urlFilter.search)
  const deferredSearch = useDeferredValue(typedSearch)
  const navigate = useNavigate({ from: ROUTE_PATH })
  const exporting = useExportActivity(projectId)
  const toolbarFilter = { ...urlFilter, search: typedSearch }

  // Replaces the entry, so each typed letter does not become a step of the Back button.
  function changeFilter(next: ActivityFilter): void {
    setTypedSearch(next.search)
    void navigate({ search: searchForFilter(next), replace: true })
  }

  return (
    <div data-wide-page className="mx-auto grid w-full max-w-7xl gap-6">
      <PageHeader
        title="Atividade"
        description="Logins, tentativas recusadas e alterações feitas em usuários."
      />
      <div className="grid gap-4">
        <ActivityToolbar
          filter={toolbarFilter}
          onChange={changeFilter}
          action={
            <ExportActivityButton
              isExporting={exporting.isPending}
              onExport={() => exporting.mutate(toolbarFilter)}
            />
          }
        />
        <ErrorAlert error={exporting.error} />
        <ActivitySummary
          projectId={projectId}
          period={urlFilter.period}
          onShowFailures={(address) =>
            changeFilter({ ...urlFilter, kind: 'failures', search: address ?? '' })
          }
        />
        <ActivityFeed
          projectId={projectId}
          filtering={{ filter: { ...urlFilter, search: deferredSearch }, onChange: changeFilter }}
        />
      </div>
    </div>
  )
}
