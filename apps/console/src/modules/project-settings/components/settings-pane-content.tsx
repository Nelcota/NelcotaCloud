import type { JSX } from 'react'

import { NotificationsPane } from '@/modules/notifications/components/notifications-pane'
import { ApiEndpointsPane } from '@/modules/project-settings/components/api-endpoints-pane'
import { AuthenticationPane } from '@/modules/project-settings/components/authentication-pane'
import { GeneralPane } from '@/modules/project-settings/components/general-pane'
import { SecurityPane } from '@/modules/project-settings/components/security-pane'
import type { SettingsTabId } from '@/modules/project-settings/components/settings-tabs'
import type { components } from '@/shared/api/api-schema'

export type PaneProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

const PANES: Record<SettingsTabId, (props: PaneProps) => JSX.Element> = {
  geral: GeneralPane,
  api: ({ projectId }) => <ApiEndpointsPane projectId={projectId} />,
  autenticacao: AuthenticationPane,
  seguranca: ({ projectId }) => <SecurityPane projectId={projectId} />,
  notificacoes: ({ projectId }) => <NotificationsPane projectId={projectId} />,
}

type SettingsPaneContentProps = PaneProps & { tabId: SettingsTabId }

/** The panels of one tab. */
export function SettingsPaneContent({ tabId, ...props }: SettingsPaneContentProps): JSX.Element {
  const Pane = PANES[tabId]

  return <Pane {...props} />
}
