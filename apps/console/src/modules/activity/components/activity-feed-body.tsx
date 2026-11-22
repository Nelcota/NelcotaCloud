import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import type { JSX } from 'react'

import { LogFooter } from '@/modules/activity/components/log-footer'
import { LogLines } from '@/modules/activity/components/log-lines'
import { LogLinesLoading } from '@/modules/activity/components/log-lines-loading'
import type { LogRowView } from '@/modules/activity/components/log-row-view'
import {
  type ActivityFilters,
  isNarrowed,
} from '@/modules/activity/components/use-activity-filters'
import type { LogFacets } from '@/modules/activity/components/use-log-facets'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'

type Schemas = components['schemas']

type ActivityFeedBodyProps = {
  pages: UseInfiniteQueryResult<InfiniteData<Schemas['AuditPage'], number | undefined>>
  facets: LogFacets
  view: LogRowView & { filters: ActivityFilters; isLive: boolean; onClear: () => void }
}

/** The log's frame in each of its states: loading, failed, empty, filtered out, or the lines. */
export function ActivityFeedBody({ pages, facets, view }: ActivityFeedBodyProps): JSX.Element {
  const shown = facets.shown

  if (shown === undefined) {
    return <LogLinesLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (facets.loadedCount === 0) {
    return <NoEvents filters={view.filters} onClear={view.onClear} />
  }

  return (
    <div
      aria-busy={pages.isPlaceholderData}
      className={cn('transition-opacity', pages.isPlaceholderData && 'opacity-60')}
    >
      <ShownLines events={shown} facets={facets} view={view} />
      <LogFooter
        lines={{ shown: shown.length, loaded: facets.loadedCount, isLive: view.isLive }}
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

type ShownLinesProps = { events: Schemas['AuditEvent'][]; facets: LogFacets; view: LogRowView }

function ShownLines({ events, facets, view }: ShownLinesProps): JSX.Element {
  if (events.length > 0) {
    return <LogLines events={events} view={view} />
  }

  return (
    <EmptyState
      isCompact
      title="Nenhuma linha carregada com esses campos"
      description="Os campos filtram só as linhas já carregadas. Carregue mais ou limpe os campos."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={facets.clearFields}>
          Limpar campos
        </Button>
      }
    />
  )
}

type NoEventsProps = { filters: ActivityFilters; onClear: () => void }

function NoEvents({ filters, onClear }: NoEventsProps): JSX.Element {
  if (isNarrowed(filters)) {
    return (
      <EmptyState
        isCompact
        title="Nenhum evento com esses filtros"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        }
      />
    )
  }

  return <EmptyState isCompact title="Nenhum evento no período" />
}
