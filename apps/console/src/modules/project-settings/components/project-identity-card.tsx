import type { JSX } from 'react'

import { ProjectFacts } from '@/modules/project-settings/components/project-facts'
import type { components } from '@/shared/api/api-schema'
import { SettingsSection } from '@/shared/ui/settings-section'

type Schemas = components['schemas']

type ProjectIdentityCardProps = {
  settings: Schemas['TenantSettings']
  project: Schemas['ProjectSummary'] | undefined
}

/** The project at a glance: its name and site, then the facts a developer looks up. */
export function ProjectIdentityCard({ settings, project }: ProjectIdentityCardProps): JSX.Element {
  return (
    <SettingsSection
      title={settings.name}
      description={
        <span className="block truncate font-mono" title={settings.site_url}>
          {settings.site_url}
        </span>
      }
    >
      <ProjectFacts project={project} />
    </SettingsSection>
  )
}
