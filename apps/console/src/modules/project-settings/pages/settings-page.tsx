import type { JSX } from 'react'

import { settingsApiSnippets } from '@/modules/project-settings/components/settings-api-snippets'
import { SettingsPaneContent } from '@/modules/project-settings/components/settings-pane-content'
import { SettingsTabList } from '@/modules/project-settings/components/settings-tab-list'
import { SettingsTabPanel } from '@/modules/project-settings/components/settings-tab-panel'
import {
  SETTINGS_TABS,
  type SettingsTabId,
} from '@/modules/project-settings/components/settings-tabs'
import { useSettingsTab } from '@/modules/project-settings/components/use-settings-tab'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { usePublishableKey } from '@/modules/project-settings/queries/use-publishable-key'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Tabs } from '@/shared/ui/primitives/tabs'

export function SettingsPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)
  const { tab, select } = useSettingsTab()
  const publishableKey = usePublishableKey(projectId)

  return (
    <Tabs value={tab} onValueChange={select} className="mx-auto w-full max-w-4xl gap-5">
      <PageHeader
        title="Configurações"
        description="Identidade, endpoints, acesso e segurança do projeto."
        actions={
          <ApiSheet
            title="Conectar pela API"
            description="O cliente do SDK e uma checagem rápida da API."
            snippets={settingsApiSnippets(publishableKey)}
          />
        }
      >
        <SettingsTabList />
      </PageHeader>
      {SETTINGS_TABS.map((item) => (
        <SettingsTabPanel key={item.id} value={item.id}>
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
          <PaneBody
            projectId={projectId}
            tabId={item.id}
            settings={settings.data}
            hasFailed={settings.isError}
          />
        </SettingsTabPanel>
      ))}
    </Tabs>
  )
}

type PaneBodyProps = {
  projectId: string
  tabId: SettingsTabId
  settings: components['schemas']['TenantSettings'] | undefined
  hasFailed: boolean
}

function PaneBody({ projectId, tabId, settings, hasFailed }: PaneBodyProps): JSX.Element | null {
  if (settings === undefined && hasFailed) {
    return null
  }

  if (settings === undefined) {
    return <PaneSkeleton />
  }

  return <SettingsPaneContent tabId={tabId} projectId={projectId} settings={settings} />
}

function PaneSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
  )
}
