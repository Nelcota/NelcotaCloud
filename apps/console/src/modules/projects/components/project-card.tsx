import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { RoleBadge } from '@/modules/projects/components/role-badge'
import { siteLabel } from '@/modules/projects/components/site-label'
import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

type ProjectSummary = components['schemas']['ProjectSummary']

/** One project; its name is the link and stretches over the card, under the copyable id. */
export function ProjectCard({ project }: { project: ProjectSummary }): JSX.Element {
  const site = siteLabel(project.site_url)

  return (
    <article className="group relative flex h-full flex-col rounded-xl border bg-card transition-[background-color,border-color,scale] focus-within:border-primary/60 hover:border-muted-foreground/40 hover:bg-surface active:scale-[0.99] motion-reduce:active:scale-100">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <ProjectAvatar name={project.name} mascotId={project.mascot_id} size="lg" />
          <RoleBadge role={project.role} />
        </div>
        <div className="grid min-w-0 gap-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-heading">
            <RouterLink
              href={`/projects/${project.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/60"
            >
              {project.name}
            </RouterLink>
          </h2>
          <p className="truncate font-mono text-xs text-muted-foreground">{project.slug}</p>
          <p className="truncate text-sm text-muted-foreground" title={site}>
            {site}
          </p>
        </div>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
        <span className="shrink-0">
          Criado em <Timestamp value={project.created_at} format="date" />
        </span>
        <IdChip
          label="ID do projeto"
          value={project.id}
          className="relative z-10 max-w-36 opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        />
      </footer>
    </article>
  )
}
