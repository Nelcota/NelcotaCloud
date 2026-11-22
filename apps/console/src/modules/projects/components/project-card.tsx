import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { ProjectActiveUsers } from '@/modules/projects/components/project-active-users'
import { projectShortcuts } from '@/modules/projects/components/project-shortcuts'
import { ProjectStatusRow } from '@/modules/projects/components/project-status-row'
import { siteLabel } from '@/modules/projects/components/site-label'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { ResourceCard } from '@/shared/ui/resource-card'
import { Timestamp } from '@/shared/ui/timestamp'

type ProjectSummary = components['schemas']['ProjectSummary']

/** One project on the canvas: name and slug, site, state, two figures and its pages as shortcuts. */
export function ProjectCard({ project }: { project: ProjectSummary }): JSX.Element {
  const href = `/projects/${project.id}`

  return (
    <ResourceCard
      name={project.name}
      href={href}
      kind={<span className="font-mono">{project.slug}</span>}
      leading={<ProjectAvatar name={project.name} mascotId={project.mascot_id} size="sm" />}
      address={siteLabel(project.site_url)}
      status={<ProjectStatusRow role={project.role} />}
      metrics={[
        { label: 'Ativos no mês', value: <ProjectActiveUsers projectId={project.id} /> },
        { label: 'Criado', value: <Timestamp value={project.created_at} format="relative" /> },
      ]}
      extra={
        <IdChip label="ID do projeto" value={project.id} className="relative z-10 max-w-full" />
      }
      shortcuts={projectShortcuts(href)}
    />
  )
}
