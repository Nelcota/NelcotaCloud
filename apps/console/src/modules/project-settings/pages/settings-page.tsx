import type { JSX } from 'react'

import { DangerZone } from '@/modules/project-settings/components/danger-zone'
import { GeneralSettingsForm } from '@/modules/project-settings/components/general-settings-form'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'

export function SettingsPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)

  if (settings.data === undefined) {
    return <ErrorAlert error={settings.error} />
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm projectId={projectId} settings={settings.data} />
        </CardContent>
      </Card>
      <DangerZone projectId={projectId} projectName={settings.data.name} />
    </div>
  )
}
