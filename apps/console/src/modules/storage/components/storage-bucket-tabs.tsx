import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** One tab per bucket, by name in the code font; the chosen one's files show below. */
export function StorageBucketTabs({ buckets }: { buckets: StorageBucket[] }): JSX.Element {
  return (
    <TabsList variant="line" aria-label="Buckets" className="w-full">
      {buckets.map((bucket) => (
        <TabsTrigger key={bucket.id} value={bucket.id} className="font-mono">
          {bucket.name}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
