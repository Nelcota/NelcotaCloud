import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { StorageApiSheet } from '@/modules/storage/components/storage-api-sheet'
import { UploadFileDialog } from '@/modules/storage/components/upload-file-dialog'
import { Button } from '@/shared/ui/primitives/button'

type StorageHeaderActionsProps = {
  projectId: string
  /** `undefined` until the buckets load, or while storage is down: nothing to create then. */
  buckets: StorageBucket[] | undefined
  selected: StorageBucket | undefined
  onCreateBucket: () => void
}

/** The API sheet, a new bucket and, once there is a bucket, the upload to the chosen one. */
export function StorageHeaderActions(props: StorageHeaderActionsProps): JSX.Element {
  const { projectId, selected } = props

  return (
    <>
      <StorageApiSheet projectId={projectId} bucketId={selected?.id ?? null} />
      <NewBucketButton isShown={props.buckets !== undefined} onCreate={props.onCreateBucket} />
      <UploadAction projectId={projectId} selected={selected} />
    </>
  )
}

function NewBucketButton(props: { isShown: boolean; onCreate: () => void }): JSX.Element | null {
  if (props.isShown === false) {
    return null
  }

  return (
    <Button type="button" variant="outline" onClick={props.onCreate}>
      <Plus aria-hidden data-icon="inline-start" />
      Novo bucket
    </Button>
  )
}

function UploadAction(props: {
  projectId: string
  selected: StorageBucket | undefined
}): JSX.Element | null {
  const bucket = props.selected

  if (bucket === undefined) {
    return null
  }

  return <UploadFileDialog key={bucket.id} projectId={props.projectId} bucket={bucket} />
}
