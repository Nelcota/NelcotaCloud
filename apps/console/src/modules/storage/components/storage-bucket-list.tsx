import Folder from '~icons/solar/folder-linear'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-files'
import { Button } from '@/shared/ui/button'

type StorageBucketListProps = {
  buckets: StorageBucket[]
  selectedId: string
  onSelect: (bucketId: string) => void
}

export function StorageBucketList({
  buckets,
  selectedId,
  onSelect,
}: StorageBucketListProps): JSX.Element {
  return (
    <section
      aria-labelledby="storage-buckets-title"
      className="bg-card min-w-0 rounded-xl border p-3"
    >
      <h2
        id="storage-buckets-title"
        className="text-muted-foreground px-2 pb-2 text-sm font-semibold"
      >
        Buckets
      </h2>
      <ul className="grid gap-1">
        {buckets.map((bucket) => (
          <li key={bucket.id}>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start aria-pressed:bg-muted"
              aria-pressed={selectedId === bucket.id}
              onClick={() => onSelect(bucket.id)}
            >
              <Folder aria-hidden="true" />
              <span className="truncate">{bucket.name}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
