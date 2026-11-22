import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { sizeLabel } from '@/modules/storage/components/storage-size'
import { useStorageObjects } from '@/modules/storage/queries/use-storage-objects'
import { StatCard } from '@/shared/ui/stat-card'

type StorageStatsProps = { projectId: string; buckets: StorageBucket[]; selected: StorageBucket }

/** The buckets, and the files of the chosen one loaded so far; more pages may follow. */
export function StorageStats({ projectId, buckets, selected }: StorageStatsProps): JSX.Element {
  const files = useStorageObjects(projectId, selected.id)
  const objects = files.data?.pages.flatMap((page) => page.items) ?? []
  const totalBytes = objects.reduce((total, file) => total + file.size_bytes, 0)
  const suffix = files.hasNextPage && '+'

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <StatCard label="Buckets" value={buckets.length.toLocaleString('pt-BR')} hint="privados" />
      <StatCard
        label="Arquivos carregados"
        value={
          <>
            {objects.length.toLocaleString('pt-BR')}
            {suffix}
          </>
        }
        hint={<span className="font-mono">{selected.name}</span>}
      />
      <StatCard
        label="Tamanho"
        value={sizeLabel(totalBytes)}
        hint="dos arquivos carregados"
        className="col-span-2 lg:col-span-1"
      />
    </div>
  )
}
