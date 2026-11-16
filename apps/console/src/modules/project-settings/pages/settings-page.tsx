import type { JSX } from 'react'

import { DangerZone } from '@/modules/project-settings/components/danger-zone'
import { GeneralSettingsForm } from '@/modules/project-settings/components/general-settings-form'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

export function SettingsPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Configurações" description="Nome, endereço do app e regras de login." />
      <ErrorAlert error={settings.error} />
      <SettingsContent projectId={projectId} settings={settings.data} />
    </div>
  )
}

type SettingsContentProps = {
  projectId: string
  settings: components['schemas']['TenantSettings'] | undefined
}

function SettingsContent({ projectId, settings }: SettingsContentProps): JSX.Element {
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
