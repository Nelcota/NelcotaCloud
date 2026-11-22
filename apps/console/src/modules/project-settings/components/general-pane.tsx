import type { JSX } from 'react'

import { GeneralSettingsForm } from '@/modules/project-settings/components/general-settings-form'
import { ProjectIdentityCard } from '@/modules/project-settings/components/project-identity-card'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'

type GeneralPaneProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

export function GeneralPane({ projectId, settings }: GeneralPaneProps): JSX.Element {
  const project = useCurrentProject(projectId)

  return (
    <>
      <ProjectIdentityCard settings={settings} project={project} />
      <GeneralSettingsForm key={projectId} projectId={projectId} settings={settings} />
    </>
  )
}
