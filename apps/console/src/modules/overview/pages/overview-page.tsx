import type { JSX } from 'react'

import { IsolationPanel } from '@/modules/overview/components/isolation-panel'
import { KeysCard } from '@/modules/overview/components/keys-card'
import { ProjectConnectPanel } from '@/modules/overview/components/project-connect-panel'
import { OverviewHeader } from '@/modules/overview/components/overview-header'
import { SmtpCard } from '@/modules/overview/components/smtp-card'
import { UsersCard } from '@/modules/overview/components/users-card'
import { useProjectId } from '@/shared/routing/use-project-id'

/** The project at a glance, from live data only, and how to plug it into an app. */
export function OverviewPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-8">
      <OverviewHeader projectId={projectId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UsersCard projectId={projectId} />
        <KeysCard projectId={projectId} />
        <SmtpCard projectId={projectId} />
      </div>
      <ProjectConnectPanel projectId={projectId} />
      <IsolationPanel projectId={projectId} />
    </div>
  )
}
