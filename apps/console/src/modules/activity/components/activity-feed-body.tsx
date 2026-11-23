import { FunnelX, SearchX, History } from 'lucide-react'
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import type { JSX } from 'react'

import { ActivityDays } from '@/modules/activity/components/activity-days'
import { ActivityFeedLoading } from '@/modules/activity/components/activity-feed-loading'
import type { FeedRowView } from '@/modules/activity/components/feed-row-view'
import { LogFooter } from '@/modules/activity/components/log-footer'
import {
  type ActivityFilters,
  isNarrowed,
} from '@/modules/activity/components/use-activity-filters'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'

type ActivityFeedBodyProps = {
  pages: UseInfiniteQueryResult<
    InfiniteData<components['schemas']['AuditPage'], number | undefined>
  >
  view: FeedRowView & { filters: ActivityFilters; isLive: boolean; onClear: () => void }
}

/** The feed's frame in each of its states: loading, failed, empty, filtered out, or the events. */
export function ActivityFeedBody({ pages, view }: ActivityFeedBodyProps): JSX.Element {
  const events = pages.data?.pages.flatMap((page) => page.events)

  if (events === undefined) {
    return <ActivityFeedLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (events.length === 0) {
    return <NoEvents filters={view.filters} onClear={view.onClear} />
  }

  return (
    <div
      aria-busy={pages.isPlaceholderData}
      className={cn('transition-opacity', pages.isPlaceholderData && 'opacity-60')}
    >
      <div className="p-1.5">
        <ActivityDays events={events} view={view} />
      </div>
      <LogFooter
        loaded={events.length}
        isLive={view.isLive}
        more={{
          hasMore: pages.hasNextPage,
          isLoading: pages.isFetchingNextPage,
          onLoad: () => pages.fetchNextPage(),
        }}
      />
      <div className="empty:hidden [&>*]:m-3">
        <LoadError error={pages.error} onRetry={() => pages.fetchNextPage()} />
      </div>
    </div>
  )
}

type NoEventsProps = { filters: ActivityFilters; onClear: () => void }

function NoEvents({ filters, onClear }: NoEventsProps): JSX.Element {
  if (isNarrowed(filters)) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden />}
        isCompact
        title="Nenhum evento com esses filtros"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <FunnelX aria-hidden data-icon="inline-start" />
            Limpar filtros
          </Button>
        }
      />
    )
  }

  return <EmptyState icon={<History aria-hidden />} isCompact title="Nenhum evento no período" />
}
