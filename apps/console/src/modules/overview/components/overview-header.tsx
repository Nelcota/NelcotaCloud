import type { JSX } from 'react'

import { SiteUrl } from '@/modules/overview/components/site-url'
import { useCurrentProject, useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

export function OverviewHeader({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)
  const projects = useProjectsQuery()

  return (
    <>
      <PageHeader title="Visão geral" description={<SiteUrl url={project?.site_url} />} />
      <ErrorAlert error={projects.error} />
    </>
  )
}
