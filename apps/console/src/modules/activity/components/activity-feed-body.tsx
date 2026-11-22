import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import type { JSX } from 'react'

import { LoadMoreButton } from '@/modules/activity/components/load-more-button'
import type { LogRowView } from '@/modules/activity/components/log-row'
import { LogTable } from '@/modules/activity/components/log-table'
import {
  type ActivityFilters,
  isNarrowed,
} from '@/modules/activity/components/use-activity-filters'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type Schemas = components['schemas']
type AuditEvent = Schemas['AuditEvent']

type ActivityFeedBodyProps = {
  events: AuditEvent[] | undefined
  pages: UseInfiniteQueryResult<InfiniteData<Schemas['AuditPage'], number | undefined>>
  view: LogRowView & { filters: ActivityFilters; onClear: () => void }
}

/** The log's frame in each of its states: loading, failed, empty, filtered out, or the events. */
export function ActivityFeedBody({ events, pages, view }: ActivityFeedBodyProps): JSX.Element {
  if (events === undefined) {
    return <FeedLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (events.length === 0 && isNarrowed(view.filters)) {
    return (
      <EmptyState
        isCompact
        title="Nenhum evento com esses filtros"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={view.onClear}>
            Limpar filtros
          </Button>
        }
      />
    )
  }

  if (events.length === 0) {
    return <EmptyState isCompact title="Nenhum evento no período" />
  }

  return (
    <div
      aria-busy={pages.isPlaceholderData}
      className={cn('transition-opacity', pages.isPlaceholderData && 'opacity-60')}
    >
      <LogTable events={events} view={view} />
      <div className="border-t empty:hidden">
        <LoadMoreButton
          hasMore={pages.hasNextPage}
          isLoading={pages.isFetchingNextPage}
          onLoad={() => pages.fetchNextPage()}
        />
      </div>
      <div className="empty:hidden [&>*]:m-3">
        <LoadError error={pages.error} onRetry={() => pages.fetchNextPage()} />
      </div>
    </div>
  )
}

type FeedLoadingProps = { error: Error | null; onRetry: () => void }

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5]

function FeedLoading({ error, onRetry }: FeedLoadingProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="p-3">
        <LoadError error={error} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <div aria-busy="true" aria-label="Carregando atividade" className="divide-y">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-6 px-4 py-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="ms-auto h-3.5 w-24" />
        </div>
      ))}
    </div>
  )
}
