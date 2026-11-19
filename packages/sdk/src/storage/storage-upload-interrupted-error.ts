export class StorageUploadInterruptedError extends Error {
  readonly objectId: string
  readonly confirmUntil: string

  constructor(upload: { object_id: string; confirm_until: string }, cause: unknown) {
    super('The upload was interrupted. Use its object ID to retry confirmation.', { cause })
    this.name = 'StorageUploadInterruptedError'
    this.objectId = upload.object_id
    this.confirmUntil = upload.confirm_until
  }
}
