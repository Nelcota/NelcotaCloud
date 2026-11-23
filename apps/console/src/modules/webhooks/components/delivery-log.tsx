import { Inbox } from 'lucide-react'
import type { JSX } from 'react'

import { type DeliveryFilter, statusOf } from '@/modules/webhooks/components/delivery-filter'
import { DeliveryLogToolbar } from '@/modules/webhooks/components/delivery-log-toolbar'
import { DeliveryOverview } from '@/modules/webhooks/components/delivery-overview'
import {
  DeliveryTable,
  type DeliveryTableProps,
} from '@/modules/webhooks/components/delivery-table'
import { LoadMoreButton } from '@/modules/webhooks/components/load-more-button'
import { RequestErrorNotice } from '@/modules/webhooks/components/request-error-notice'
import {
  useDeliveryLogQuery,
  useRetryWebhookDeliveryMutation,
  useWebhookDeliveriesQuery,
} from '@/modules/webhooks/queries/use-webhook-deliveries'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = ['first', 'second', 'third', 'fourth']

type DeliveryLogProps = {
  projectId: string
  endpointId: string
  filter: { value: DeliveryFilter; onChange: (filter: DeliveryFilter) => void }
}

/** The newest deliveries at a glance, then the log filtered by state, 50 rows at a time. */
export function DeliveryLog({ projectId, endpointId, filter }: DeliveryLogProps): JSX.Element {
  const newest = useWebhookDeliveriesQuery(projectId, endpointId)

  if (newest.data === undefined && newest.isError) {
    return <LoadError error={newest.error} onRetry={() => newest.refetch()} />
  }

  if (newest.data === undefined) {
    return <LogSkeleton />
  }

  if (newest.data.length === 0) {
    return (
      <EmptyState
        icon={<Inbox aria-hidden />}
        title="As entregas aparecem aqui quando um evento acontece."
        isCompact
        isFramed
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DeliveryOverview deliveries={newest.data} loadedAt={newest.dataUpdatedAt} />
      <FilteredLog projectId={projectId} endpointId={endpointId} filter={filter} />
    </div>
  )
}

function FilteredLog({ projectId, endpointId, filter }: DeliveryLogProps): JSX.Element {
  const log = useDeliveryLogQuery({ projectId, endpointId, status: statusOf(filter.value) })
  const retry = useRetryWebhookDeliveryMutation(projectId)
  const rows = log.data?.pages.flat()

  return (
    <div className="flex flex-col gap-3">
      <DeliveryLogToolbar
        projectId={projectId}
        endpointId={endpointId}
        filter={filter}
        hasRows={(rows?.length ?? 0) > 0}
      />
      <RequestErrorNotice error={retry.error} />
      <LoadError error={log.error} onRetry={() => log.refetch()} />
      <LogRows
        rows={rows}
        filter={filter.value}
        loadedAt={log.dataUpdatedAt}
        retry={{
          retryingId: retryingIdOf(retry.isPending, retry.variables?.deliveryId),
          onRetry: (deliveryId) => retry.mutate({ endpointId, deliveryId }),
        }}
        footer={
          <LoadMoreButton
            hasMore={log.hasNextPage}
            isLoading={log.isFetchingNextPage}
            onLoad={() => void log.fetchNextPage()}
          />
        }
      />
    </div>
  )
}

type LogRowsProps = Omit<DeliveryTableProps, 'deliveries'> & {
  /** `undefined` while the first page loads. */
  rows: DeliveryTableProps['deliveries'] | undefined
}

function LogRows({ rows, ...table }: LogRowsProps): JSX.Element {
  if (rows === undefined) {
    return <RowsSkeleton />
  }

  return <DeliveryTable deliveries={rows} {...table} />
}

function LogSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 rounded-xl" />
      <RowsSkeleton />
    </div>
  )
}

function RowsSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {SKELETON_ROWS.map((row) => (
        <Skeleton key={row} className="h-12 rounded-lg" />
      ))}
    </div>
  )
}

function retryingIdOf(isPending: boolean, deliveryId: string | undefined): string | null {
  if (isPending === false || deliveryId === undefined) {
    return null
  }

  return deliveryId
}
