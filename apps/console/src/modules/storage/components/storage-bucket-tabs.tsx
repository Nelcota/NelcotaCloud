import Folder from '~icons/solar/folder-linear'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** One quiet tab per bucket on the side; the chosen one's files show beside it. */
export function StorageBucketTabs({ buckets }: { buckets: StorageBucket[] }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="ps-3 pb-1 text-sm font-medium text-muted-foreground">Buckets</span>
      <TabsList
        variant="line"
        aria-label="Buckets"
        className="flex h-auto w-full flex-col items-stretch gap-0.5 p-0"
      >
        {buckets.map((bucket) => (
          <TabsTrigger
            key={bucket.id}
            value={bucket.id}
            className="h-9 w-full flex-none justify-start rounded-md px-3 font-mono text-muted-foreground after:hidden hover:bg-surface hover:text-foreground data-active:bg-surface-hover data-active:text-foreground dark:data-active:bg-surface-hover"
          >
            <Folder aria-hidden />
            <span className="truncate">{bucket.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}
