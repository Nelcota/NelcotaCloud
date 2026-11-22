import type { JSX } from 'react'
import { useState } from 'react'

import { CreateBucketDialog } from '@/modules/storage/components/create-bucket-dialog'
import { StorageContent } from '@/modules/storage/components/storage-content'
import { StorageHeaderActions } from '@/modules/storage/components/storage-header-actions'
import { StorageLoadFailure } from '@/modules/storage/components/storage-load-failure'
import { useStorageBuckets } from '@/modules/storage/queries/use-storage-buckets'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { IdChip } from '@/shared/ui/id-chip'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

export function ProjectStorage({ projectId }: { projectId: string }): JSX.Element {
  const query = useStorageBuckets(projectId)
  const [selectedId, setSelectedId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const buckets = query.data
  const selected = buckets?.find((bucket) => bucket.id === selectedId) ?? buckets?.at(0)

  function showBucket(bucketId: string): void {
    setSelectedId(bucketId)
    setIsCreating(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Arquivos"
        description="Arquivos privados do projeto, guardados em buckets."
        actions={
          <StorageHeaderActions
            projectId={projectId}
            buckets={buckets}
            selected={selected}
            onCreateBucket={() => setIsCreating(true)}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <IdChip label="Endpoint" value={`${API_BASE_URL}/storage/v1`} isLabelVisible />
          <SelectedBucketChip bucketId={selected?.id} />
        </div>
      </PageHeader>
      <StorageBody
        query={query}
        content={
          <StorageContent
            projectId={projectId}
            buckets={buckets}
            selected={selected}
            onSelect={setSelectedId}
            onCreateBucket={() => setIsCreating(true)}
          />
        }
      />
      <CreateBucketDialog
        projectId={projectId}
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={showBucket}
      />
    </div>
  )
}

function SelectedBucketChip({ bucketId }: { bucketId: string | undefined }): JSX.Element | null {
  if (bucketId === undefined) {
    return null
  }

  return <IdChip label="ID do bucket" value={bucketId} isLabelVisible />
}

type StorageBodyProps = {
  query: ReturnType<typeof useStorageBuckets>
  content: JSX.Element
}

/** A first load that failed replaces the page's content; a failed refresh keeps the buckets. */
function StorageBody({ query, content }: StorageBodyProps): JSX.Element {
  const error = query.error

  if (query.data === undefined && error !== null) {
    return (
      <StorageLoadFailure
        error={error}
        isRetrying={query.isFetching}
        onRetry={() => query.refetch()}
      />
    )
  }

  return (
    <>
      <LoadError error={error} onRetry={() => query.refetch()} />
      {content}
    </>
  )
}
