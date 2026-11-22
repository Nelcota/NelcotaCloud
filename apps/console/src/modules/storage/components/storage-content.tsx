import Folder from '~icons/solar/folder-linear'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { StorageBuckets } from '@/modules/storage/components/storage-buckets'
import { StorageStats } from '@/modules/storage/components/storage-stats'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type StorageContentProps = {
  projectId: string
  buckets: StorageBucket[] | undefined
  selected: StorageBucket | undefined
  onSelect: (bucketId: string) => void
}

/** The figures, the buckets and the chosen one's files; "Novo bucket" is in the header. */
export function StorageContent(props: StorageContentProps): JSX.Element {
  const { projectId, buckets, selected } = props

  if (buckets === undefined) {
    return (
      <div role="status" aria-label="Carregando buckets" className="flex flex-col gap-8">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (selected === undefined) {
    return (
      <EmptyState
        isFramed
        icon={<Folder aria-hidden />}
        title="Nenhum bucket ainda"
        description="Crie um em Novo bucket para começar a guardar arquivos."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
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
