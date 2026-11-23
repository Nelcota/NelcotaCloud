import type { JSX } from 'react'

import { CaptchaSection } from '@/modules/project-settings/captcha/components/captcha-section'
import { BlockedAddressesSection } from '@/modules/project-settings/ip-blocks/components/blocked-addresses-section'
import { DangerZone } from '@/modules/project-settings/general/components/danger-zone'
import { GeneralSettingsForm } from '@/modules/project-settings/general/components/general-settings-form'
import { ProjectMascotSection } from '@/modules/project-settings/general/components/project-mascot-section'
import { useSettingsQuery } from '@/modules/project-settings/general/queries/use-general-settings'
import { NotificationsSection } from '@/modules/notifications/components/notifications-section'
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
      <PageHeader
        title="Configurações"
        description="Nome, site do app, regras de login, proteção contra bots, IPs bloqueados e notificações."
      />
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
      <ProjectMascotSection key={projectId} projectId={projectId} mascotId={settings.mascot_id} />
      <CaptchaSection projectId={projectId} />
      <BlockedAddressesSection projectId={projectId} />
      <NotificationsSection projectId={projectId} />
      <DangerZone projectId={projectId} projectName={settings.name} />
    </>
  )
}
