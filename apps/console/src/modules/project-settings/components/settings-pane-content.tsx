import type { JSX } from 'react'

import { ApiEndpointsPane } from '@/modules/project-settings/components/api-endpoints-pane'
import { AuthenticationPane } from '@/modules/project-settings/components/authentication-pane'
import { DangerZone } from '@/modules/project-settings/components/danger-zone'
import { GeneralPane } from '@/modules/project-settings/components/general-pane'
import type { SettingsPaneId } from '@/modules/project-settings/components/settings-panes'
import { SecurityPane } from '@/modules/project-settings/components/security-pane'
import type { components } from '@/shared/api/api-schema'

export type PaneProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

const PANES: Record<SettingsPaneId, (props: PaneProps) => JSX.Element> = {
  geral: GeneralPane,
  api: ({ projectId }) => <ApiEndpointsPane projectId={projectId} />,
  autenticacao: AuthenticationPane,
  seguranca: ({ projectId }) => <SecurityPane projectId={projectId} />,
  perigo: ({ projectId, settings }) => (
    <DangerZone projectId={projectId} projectName={settings.name} />
  ),
}

type SettingsPaneContentProps = PaneProps & { paneId: SettingsPaneId }

/** The groups of the open pane. */
export function SettingsPaneContent({ paneId, ...props }: SettingsPaneContentProps): JSX.Element {
  const Pane = PANES[paneId]

  return <Pane {...props} />
}
