import Folder from '~icons/solar/folder-linear'
import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { CreateBucketForm } from '@/modules/storage/components/create-bucket-form'
import { StorageBucketList } from '@/modules/storage/components/storage-bucket-list'
import { StorageObjects } from '@/modules/storage/components/storage-objects'
import { useStorageBuckets } from '@/modules/storage/queries/use-storage-buckets'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

export function StoragePage(): JSX.Element {
  const projectId = useProjectId()

  return <ProjectStorage key={projectId} projectId={projectId} />
}

function ProjectStorage({ projectId }: { projectId: string }): JSX.Element {
  const query = useStorageBuckets(projectId)
  const [selectedId, setSelectedId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const buckets = query.data ?? []
  const selected = buckets.find((bucket) => bucket.id === selectedId) ?? buckets[0]

  function showBucket(bucketId: string): void {
    setSelectedId(bucketId)
    setIsCreating(false)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Arquivos"
        description="Armazene arquivos privados em buckets do projeto."
        actions={
          <Button
            disabled={query.data === undefined || isCreating}
            onClick={() => setIsCreating(true)}
          >
            <Plus aria-hidden="true" />
            Novo bucket
          </Button>
        }
      />
      <LoadError error={query.error} onRetry={() => query.refetch()} />
      {query.isPending && <Skeleton className="h-36 rounded-xl" />}
      {isCreating && (
        <CreateBucketForm
          projectId={projectId}
          onCreated={showBucket}
          onCancel={() => setIsCreating(false)}
        />
      )}
      {query.data !== undefined && selected === undefined && isCreating === false && (
        <EmptyState
          icon={Folder}
          title="Nenhum bucket"
          description="Crie um bucket para enviar o primeiro arquivo."
        />
      )}
      {selected !== undefined && (
        <div className="grid items-start gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
          <StorageBucketList buckets={buckets} selectedId={selected.id} onSelect={setSelectedId} />
          <StorageObjects key={selected.id} projectId={projectId} bucket={selected} />
        </div>
      )}
    </div>
  )
}
