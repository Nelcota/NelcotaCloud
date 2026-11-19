import type { JSX } from 'react'

import { RecentActivity } from '@/modules/activity/components/recent-activity'
import { ActiveUsersCard } from '@/modules/overview/components/active-users-card'
import { AttentionPanel } from '@/modules/overview/components/attention-panel'
import { DailyActivityChart } from '@/modules/overview/components/daily-activity-chart'
import { OverviewHeader } from '@/modules/overview/components/overview-header'
import { ProjectConnectPanel } from '@/modules/overview/components/project-connect-panel'
import { TablesCard } from '@/modules/overview/components/tables-card'
import { UsersCard } from '@/modules/overview/components/users-card'
import { WebhooksCard } from '@/modules/overview/components/webhooks-card'
import type { QueueHealth } from '@/modules/webhooks/model/webhook-queue-health'
import { useWebhookQueueHealth } from '@/modules/webhooks/queries/use-webhook-queue-health'
import { useProjectId } from '@/shared/routing/use-project-id'

/**
 * The project at a glance, from live data only: what needs fixing, its figures, the last month
 * day by day, what happened lately, and how to plug it into an app until the first user arrives.
 */
export function OverviewPage(): JSX.Element {
  const projectId = useProjectId()
  const webhookQueue = useWebhookQueueHealth(projectId)
  let webhookHealth: QueueHealth | undefined

  if (webhookQueue.data?.kind === 'reading' && webhookQueue.error === null) {
    webhookHealth = webhookQueue.data.reading.health
  }

  return (
    <div className="grid gap-6">
      <OverviewHeader projectId={projectId} />
      <AttentionPanel projectId={projectId} webhookHealth={webhookHealth} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UsersCard projectId={projectId} />
        <ActiveUsersCard projectId={projectId} />
        <TablesCard projectId={projectId} />
        <WebhooksCard projectId={projectId} query={webhookQueue} />
      </div>
      <DailyActivityChart projectId={projectId} />
      <ProjectConnectPanel projectId={projectId} />
      <RecentActivity projectId={projectId} />
    </div>
  )
}
