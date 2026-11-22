import type { JSX } from 'react'

import { EndpointRow } from '@/modules/project-settings/components/endpoint-row'
import { RowLink } from '@/modules/project-settings/components/row-link'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { usePublishableKey } from '@/modules/project-settings/queries/use-publishable-key'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** The ids that name the project in code: its id, its slug and its public key. */
export function ProjectIdentifiers({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)

  if (project === undefined) {
    return <Skeleton className="h-52 rounded-xl" />
  }

  return (
    <SettingsGroup title="Identificadores">
      <EndpointRow
        label="ID do projeto"
        meaning="O projectId do createAccessTokenVerifier no seu servidor."
        value={project.id}
      />
      <EndpointRow
        label="Slug"
        meaning="Nome curto e fixo; o banco do projeto é tenant_<slug>."
        value={project.slug}
      />
      <PublishableKeyRow projectId={projectId} />
    </SettingsGroup>
  )
}

/** The public key goes in browser code; without one in full, the way to the keys page. */
function PublishableKeyRow({ projectId }: { projectId: string }): JSX.Element {
  const publishableKey = usePublishableKey(projectId)
  const meaning = 'Pública: pode ir no código do navegador.'

  if (publishableKey === null) {
    return (
      <SettingsRow title="Chave publicável" description={meaning}>
        <RowLink href={`/projects/${projectId}/keys`} label="Ver chaves" />
      </SettingsRow>
    )
  }

  return <EndpointRow label="Chave publicável" meaning={meaning} value={publishableKey} />
}
