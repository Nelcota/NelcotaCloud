import { Plus, Folder } from 'lucide-react'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { StorageBuckets } from '@/modules/storage/components/storage-buckets'
import { StorageStats } from '@/modules/storage/components/storage-stats'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type StorageContentProps = {
  projectId: string
  buckets: StorageBucket[] | undefined
  selected: StorageBucket | undefined
  onSelect: (bucketId: string) => void
  onCreateBucket: () => void
}

/** The figures, the buckets and the chosen one's files; "Novo bucket" is in the header. */
export function StorageContent(props: StorageContentProps): JSX.Element {
  const { projectId, buckets, selected } = props

  if (buckets === undefined) {
    return (
      <div role="status" aria-label="Carregando buckets" className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 @min-[48rem]:grid-cols-4">
          <Skeleton className="h-27 rounded-xl" />
          <Skeleton className="h-27 rounded-xl" />
          <Skeleton className="h-27 rounded-xl" />
          <Skeleton className="h-27 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  if (selected === undefined) {
    return (
      <EmptyState
        isFramed
        icon={<Folder aria-hidden />}
        title="Nenhum bucket ainda"
        actions={
          <Button type="button" size="sm" onClick={props.onCreateBucket}>
            <Plus aria-hidden data-icon="inline-start" />
            Novo bucket
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StorageStats projectId={projectId} buckets={buckets} selected={selected} />
      <StorageBuckets
        projectId={projectId}
        buckets={buckets}
        selected={selected}
        onSelect={props.onSelect}
      />
    </div>
  )
}
