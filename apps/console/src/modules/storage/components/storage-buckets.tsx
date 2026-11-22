import { Tabs as TabsPrimitive } from 'radix-ui'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { StorageBucketTabs } from '@/modules/storage/components/storage-bucket-tabs'
import { StorageObjects } from '@/modules/storage/components/storage-objects'
import { Tabs } from '@/shared/ui/primitives/tabs'

type StorageBucketsProps = {
  projectId: string
  buckets: StorageBucket[]
  selected: StorageBucket
  onSelect: (bucketId: string) => void
}

/** The buckets in a list on the side; the files of the chosen one beside it. */
export function StorageBuckets(props: StorageBucketsProps): JSX.Element {
  const { projectId, selected } = props

  return (
    <Tabs
      value={selected.id}
      onValueChange={props.onSelect}
      orientation="vertical"
      className="grid items-start gap-6 md:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <StorageBucketTabs buckets={props.buckets} />
      <TabsPrimitive.Content value={selected.id} className="min-w-0 outline-none">
        <StorageObjects key={selected.id} projectId={projectId} bucket={selected} />
      </TabsPrimitive.Content>
    </Tabs>
  )
}
