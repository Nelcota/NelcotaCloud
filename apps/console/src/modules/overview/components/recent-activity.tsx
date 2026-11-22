import { ArrowRight } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { RecentEventRow } from '@/modules/overview/components/recent-event-row'
import { useRecentEventsQuery } from '@/modules/overview/queries/use-recent-events-query'
import { RouterLink } from '@/shared/routing/router-link'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** The newest events of the activity log, as log lines. */
export function RecentActivity({ projectId }: { projectId: string }): JSX.Element {
  const events = useRecentEventsQuery(projectId)
  const list = events.data?.events

  if (list === undefined) {
    return (
      <ActivityFrame projectId={projectId}>
        <div className="grid gap-3 p-4">
          <LoadError error={events.error} onRetry={() => void events.refetch()} />
          {events.isError === false && <Skeleton className="h-64 rounded-lg" />}
        </div>
      </ActivityFrame>
    )
  }

  if (list.length === 0) {
    return (
      <ActivityFrame projectId={projectId}>
        <EmptyState
          title="Nenhum evento ainda"
          description="Logins, cadastros e mudanças aparecem aqui."
          isCompact
        />
      </ActivityFrame>
    )
  }

  return (
    <ActivityFrame projectId={projectId}>
      <ul className="grid gap-px p-1.5">
        {list.map((event) => (
          <RecentEventRow key={event.id} event={event} projectId={projectId} />
        ))}
      </ul>
    </ActivityFrame>
  )
}

type ActivityFrameProps = { projectId: string; children: ReactNode }

function ActivityFrame({ projectId, children }: ActivityFrameProps): JSX.Element {
  return (
    <section
      aria-labelledby="recent-activity-title"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
        <h2 id="recent-activity-title" className="type-label text-muted-foreground">
          Atividade recente
        </h2>
        <Button asChild variant="ghost" size="sm">
          <RouterLink href={`/projects/${projectId}/activity`}>
            Ver atividade
            <ArrowRight aria-hidden data-icon="inline-end" />
          </RouterLink>
        </Button>
      </div>
      {children}
    </section>
  )
}
