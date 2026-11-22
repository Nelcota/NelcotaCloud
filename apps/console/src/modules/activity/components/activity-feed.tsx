import type { JSX } from 'react'

import { ActivityLog } from '@/modules/activity/components/activity-log'
import { useActivityFilters } from '@/modules/activity/components/use-activity-filters'

type ActivityFeedProps = { projectId: string; userId?: string }

/** The activity log with its own filters, as one user's page shows it (whole 90 days). */
export function ActivityFeed({ projectId, userId }: ActivityFeedProps): JSX.Element {
  const control = useActivityFilters()

  return <ActivityLog projectId={projectId} userId={userId} control={control} />
}
