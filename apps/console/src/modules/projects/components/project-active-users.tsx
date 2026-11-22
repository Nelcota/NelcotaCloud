import type { JSX } from 'react'

import { useProjectUsageQuery } from '@/modules/overview/queries/use-project-usage-query'
import { formatCount } from '@/shared/lib/format-number'
import { AnimatedNumber } from '@/shared/ui/animated-number'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** This month's active users of one project, read from its usage like the overview does. */
export function ProjectActiveUsers({ projectId }: { projectId: string }): JSX.Element {
  const usage = useProjectUsageQuery(projectId)

  if (usage.isError) {
    return <span className="text-muted-foreground">—</span>
  }

  if (usage.data === undefined) {
    return <Skeleton className="h-4 w-10" />
  }

  return <AnimatedNumber value={usage.data.active_users_this_month} format={formatCount} />
}
