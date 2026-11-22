import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { StorageBucketTabs } from '@/modules/storage/components/storage-bucket-tabs'
import { StorageObjects } from '@/modules/storage/components/storage-objects'
import { Tabs, TabsContent } from '@/shared/ui/primitives/tabs'

type StorageBucketsProps = {
  projectId: string
  buckets: StorageBucket[]
  selected: StorageBucket
  onSelect: (bucketId: string) => void
}

/** The buckets as tabs; the files of the chosen one under them. */
export function StorageBuckets(props: StorageBucketsProps): JSX.Element {
  const { projectId, selected } = props

  return (
    <Tabs value={selected.id} onValueChange={props.onSelect} className="gap-4">
      <StorageBucketTabs buckets={props.buckets} />
      <TabsContent value={selected.id}>
        <StorageObjects key={selected.id} projectId={projectId} bucket={selected} />
      </TabsContent>
    </Tabs>
  )
}
