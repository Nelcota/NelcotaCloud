import type { JSX } from 'react'

import { EndpointRow } from '@/modules/project-settings/components/endpoint-row'
import { PROJECT_ENDPOINTS } from '@/modules/project-settings/components/project-endpoints'
import { ProjectIdentifiers } from '@/modules/project-settings/components/project-identifiers'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'

/** Everything an app needs to reach this project, each value with what it is for. */
export function ApiEndpointsPane({ projectId }: { projectId: string }): JSX.Element {
  return (
    <>
      <ProjectIdentifiers projectId={projectId} />
      <SettingsGroup title="Endpoints" description="Envie a chave do projeto no header apikey.">
        {PROJECT_ENDPOINTS.map((endpoint) => (
          <EndpointRow key={endpoint.label} {...endpoint} />
        ))}
      </SettingsGroup>
    </>
  )
}
