export function storageBucketKey(projectId: string): readonly [string, string] {
  return ['storage-buckets', projectId]
}

export function storageObjectKey(
  projectId: string,
  bucketId: string,
): readonly [string, string, string] {
  return ['storage-objects', projectId, bucketId]
}
