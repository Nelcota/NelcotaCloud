import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { ProjectFacts } from '@/modules/project-settings/components/project-facts'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

type ProjectIdentityCardProps = {
  settings: Schemas['TenantSettings']
  project: Schemas['ProjectSummary'] | undefined
}

/** The project at a glance: its mark and name, then the facts a developer looks up. */
export function ProjectIdentityCard({ settings, project }: ProjectIdentityCardProps): JSX.Element {
  return (
    <section
      aria-label="Identidade do projeto"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex min-w-0 items-center gap-4 px-6 py-5">
        <ProjectAvatar name={settings.name} mascotId={settings.mascot_id} size="xl" />
        <div className="grid min-w-0 gap-1">
          <p className="truncate text-xl font-semibold text-heading">{settings.name}</p>
          <p className="truncate font-mono text-sm text-muted-foreground" title={settings.site_url}>
            {settings.site_url}
          </p>
        </div>
      </div>
      <ProjectFacts project={project} />
    </section>
  )
}
