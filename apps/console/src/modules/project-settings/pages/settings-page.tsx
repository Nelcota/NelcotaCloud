import type { JSX } from 'react'

import { DangerZone } from '@/modules/project-settings/components/danger-zone'
import { GeneralSettingsForm } from '@/modules/project-settings/components/general-settings-form'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

export function SettingsPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Configurações" description="Nome, site do app e regras de login." />
      <LoadError error={settings.error} onRetry={() => settings.refetch()} />
      <SettingsContent
        projectId={projectId}
        settings={settings.data}
        hasFailed={settings.isError}
      />
    </div>
  )
}

type SettingsContentProps = {
  projectId: string
  settings: components['schemas']['TenantSettings'] | undefined
  hasFailed: boolean
}

function SettingsContent({
  projectId,
  settings,
  hasFailed,
}: SettingsContentProps): JSX.Element | null {
  if (settings === undefined && hasFailed) {
    return null
  }

  if (settings === undefined) {
    return <Skeleton className="h-80 rounded-xl" />
  }

  return (
    <>
      <GeneralSettingsForm projectId={projectId} settings={settings} />
      <DangerZone projectId={projectId} projectName={settings.name} />
    </>
  )
}
