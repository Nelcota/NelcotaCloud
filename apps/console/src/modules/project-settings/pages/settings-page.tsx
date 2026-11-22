import type { JSX } from 'react'

import { settingsApiSnippets } from '@/modules/project-settings/components/settings-api-snippets'
import { SettingsNav } from '@/modules/project-settings/components/settings-nav'
import { SettingsPaneContent } from '@/modules/project-settings/components/settings-pane-content'
import type { SettingsPaneId } from '@/modules/project-settings/components/settings-panes'
import { SettingsPaneView } from '@/modules/project-settings/components/settings-pane-view'
import { useSettingsPane } from '@/modules/project-settings/components/use-settings-pane'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { usePublishableKey } from '@/modules/project-settings/queries/use-publishable-key'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

export function SettingsPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)
  const pane = useSettingsPane()
  const publishableKey = usePublishableKey(projectId)

  return (
    <div className="flex flex-col gap-6">
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
      />
      <div className="grid gap-5 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav projectId={projectId} current={pane} />
        <SettingsPaneView pane={pane}>
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
          <PaneBody
            projectId={projectId}
            paneId={pane.id}
            settings={settings.data}
            hasFailed={settings.isError}
          />
        </SettingsPaneView>
      </div>
    </div>
  )
}

type PaneBodyProps = {
  projectId: string
  paneId: SettingsPaneId
  settings: components['schemas']['TenantSettings'] | undefined
  hasFailed: boolean
}

function PaneBody({ projectId, paneId, settings, hasFailed }: PaneBodyProps): JSX.Element | null {
  if (settings === undefined && hasFailed) {
    return null
  }

  if (settings === undefined) {
    return <PaneSkeleton />
  }

  return <SettingsPaneContent paneId={paneId} projectId={projectId} settings={settings} />
}

function PaneSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}
