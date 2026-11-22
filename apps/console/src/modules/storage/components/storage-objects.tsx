import type { JSX } from 'react'

import type { StorageBucket, StorageObject } from '@/modules/storage/api/storage-types'
import { DeleteBucketMenu } from '@/modules/storage/components/delete-bucket-menu'
import { StorageFileTable } from '@/modules/storage/components/storage-file-table'
import { useStorageObjects } from '@/modules/storage/queries/use-storage-objects'
import { formatCount } from '@/shared/lib/format-number'
import { LoadError } from '@/shared/ui/load-error'
import { PendingButton } from '@/shared/ui/pending-button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type StorageObjectsProps = { projectId: string; bucket: StorageBucket }

/** The chosen bucket's files in a framed table, with the bucket's own actions in its header. */
export function StorageObjects({ projectId, bucket }: StorageObjectsProps): JSX.Element {
  const files = useStorageObjects(projectId, bucket.id)
  const objects = files.data?.pages.flatMap((page) => page.items)

  return (
    <section aria-label={`Arquivos de ${bucket.name}`} className="flex min-w-0 flex-col gap-3">
      <LoadError error={files.error} onRetry={() => files.refetch()} />
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex h-10 items-center justify-between gap-2 border-b border-border/60 ps-4 pe-2">
          <h2 className="min-w-0 truncate text-xs text-muted-foreground tabular-nums">
            <span className="sr-only">{bucket.name}: </span>
            <FileCount objects={objects} hasMore={files.hasNextPage} />
          </h2>
          <DeleteBucketMenu projectId={projectId} bucket={bucket} />
        </div>
        <FilesContent projectId={projectId} objects={objects} isPending={files.isPending} />
        <LoadMore
          hasNextPage={files.hasNextPage}
          isFetching={files.isFetching}
          onLoad={() => void files.fetchNextPage({ cancelRefetch: false })}
        />
      </div>
    </section>
  )
}

type FileCountProps = { objects: StorageObject[] | undefined; hasMore: boolean }

function FileCount({ objects, hasMore }: FileCountProps): JSX.Element | null {
  if (objects === undefined) {
    return <>Arquivos</>
  }

  return <>{fileCountText(objects.length, hasMore)}</>
}

/** "5 arquivos", or "50+ arquivos" while more pages wait to load. */
function fileCountText(count: number, hasMore: boolean): string {
  if (hasMore) {
    return `${formatCount(count)}+ arquivos`
  }

  if (count === 1) {
    return '1 arquivo'
  }

  return `${formatCount(count)} arquivos`
}

type FilesContentProps = {
  projectId: string
  objects: StorageObject[] | undefined
  isPending: boolean
}

function FilesContent({ projectId, objects, isPending }: FilesContentProps): JSX.Element | null {
  if (isPending) {
    return (
      <div role="status" aria-label="Carregando arquivos" className="p-4">
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (objects === undefined) {
    return null
  }

  return <StorageFileTable objects={objects} projectId={projectId} />
}

type LoadMoreProps = { hasNextPage: boolean; isFetching: boolean; onLoad: () => void }

function LoadMore({ hasNextPage, isFetching, onLoad }: LoadMoreProps): JSX.Element | null {
  if (hasNextPage === false) {
    return null
  }

  return (
    <div className="flex justify-center border-t border-border/60 px-4 py-1.5">
      <PendingButton
        type="button"
        variant="ghost"
        size="sm"
        isPending={isFetching}
        onClick={onLoad}
      >
        Carregar mais
      </PendingButton>
    </div>
  )
}
