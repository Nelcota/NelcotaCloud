import type { JSX } from 'react'

import type { StorageBucket, StorageObject } from '@/modules/storage/api/storage-types'
import { MAX_FILE_BYTES } from '@/modules/storage/components/storage-limits'
import { useStorageObjects } from '@/modules/storage/queries/use-storage-objects'
import { formatBytes, formatCount, formatShare } from '@/shared/lib/format-number'
import { Progress } from '@/shared/ui/primitives/progress'
import { StatCard } from '@/shared/ui/stat-card'

type StorageStatsProps = { projectId: string; buckets: StorageBucket[]; selected: StorageBucket }

/** The buckets, and the files of the chosen one loaded so far; more pages may follow. */
export function StorageStats({ projectId, buckets, selected }: StorageStatsProps): JSX.Element {
  const files = useStorageObjects(projectId, selected.id)
  const objects = files.data?.pages.flatMap((page) => page.items) ?? []
  const totalBytes = objects.reduce((total, file) => total + file.size_bytes, 0)
  const suffix = files.hasNextPage && '+'

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Buckets" value={formatCount(buckets.length)} hint="privados do projeto" />
      <StatCard
        label="Arquivos"
        value={
          <>
            {formatCount(objects.length)}
            {suffix}
          </>
        }
        hint={
          <>
            em <span className="font-mono">{selected.name}</span>
          </>
        }
      />
      <StatCard label="Tamanho" value={formatBytes(totalBytes)} hint="dos arquivos listados" />
      <LargestFileCard objects={objects} />
    </div>
  )
}

/** How close the biggest file came to the per-file upload limit. */
function LargestFileCard({ objects }: { objects: StorageObject[] }): JSX.Element {
  const largest = objects.reduce((biggest, file) => Math.max(biggest, file.size_bytes), 0)
  const share = Math.min(largest / MAX_FILE_BYTES, 1)

  return (
    <StatCard
      label="Maior arquivo"
      value={formatBytes(largest)}
      hint={`${formatShare(share)} do limite de ${formatBytes(MAX_FILE_BYTES)}`}
    >
      <Progress
        value={share * 100}
        aria-label="Maior arquivo em relação ao limite por arquivo"
        className="mt-1 bg-surface-hover [&>[data-slot=progress-indicator]]:bg-chart-1"
      />
    </StatCard>
  )
}
