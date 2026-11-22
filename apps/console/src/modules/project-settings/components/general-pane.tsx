import type { JSX } from 'react'

import { DangerZone } from '@/modules/project-settings/components/danger-zone'
import { GeneralSettingsForm } from '@/modules/project-settings/components/general-settings-form'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'

type GeneralPaneProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

/** The project's name and site, then, isolated at the bottom, the actions without return. */
export function GeneralPane({ projectId, settings }: GeneralPaneProps): JSX.Element {
  const project = useCurrentProject(projectId)

  return (
    <>
      <GeneralSettingsForm
        key={projectId}
        projectId={projectId}
        settings={settings}
        project={project}
      />
      <DangerZone projectId={projectId} projectName={settings.name} project={project} />
    </>
  )
}
