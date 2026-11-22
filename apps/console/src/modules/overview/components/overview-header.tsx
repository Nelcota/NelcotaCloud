import type { JSX } from 'react'

import { ConnectApiSheet } from '@/modules/overview/components/connect-api-sheet'
import { FactsBar } from '@/modules/overview/components/facts-bar'
import { ProjectState } from '@/modules/overview/components/project-state'
import { PeriodControl } from '@/modules/overview/components/period-control'
import { useAiContext } from '@/modules/overview/queries/use-ai-context'
import { useProjectHealth } from '@/modules/overview/queries/use-project-health'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

type OverviewHeaderProps = {
  projectId: string
  days: number
  onDaysChange: (days: number) => void
}

/** The project's name and state, the values devs copy, and the period every figure follows. */
export function OverviewHeader({
  projectId,
  days,
  onDaysChange,
}: OverviewHeaderProps): JSX.Element {
  const settings = useSettingsQuery(projectId)
  const project = useCurrentProject(projectId)
  const { context } = useAiContext(projectId)
  const health = useProjectHealth(projectId, days)
  const name = settings.data?.name ?? project?.name ?? 'Visão geral'
  const siteUrl = settings.data?.site_url ?? project?.site_url

  return (
    <div className="grid gap-3">
      <PageHeader
        title={name}
        description={<ProjectState slug={project?.slug} health={health} />}
        actions={
          <>
            <PeriodControl days={days} onDaysChange={onDaysChange} />
            <ConnectApiSheet context={context} />
          </>
        }
      >
        <FactsBar projectId={projectId} siteUrl={siteUrl} />
      </PageHeader>
      <ErrorAlert error={settings.error} />
    </div>
  )
}
