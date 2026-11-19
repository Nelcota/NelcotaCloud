import type { StorageUpload } from '@nelcota/sdk'

export type UploadAttempt = { signed: StorageUpload; uploaded: boolean }
type PendingUpload = { current: UploadAttempt | null }
type UploadTransfer = {
  reserve: () => Promise<StorageUpload>
  send: (signed: StorageUpload) => Promise<void>
  confirm: (objectId: string) => Promise<void>
}

export async function runUploadAttempt(
  attempt: PendingUpload,
  transfer: UploadTransfer,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted()
  const signed = attempt.current?.signed ?? (await transfer.reserve())
  signal.throwIfAborted()
  const progress = attempt.current ?? { signed, uploaded: false }
  attempt.current = progress

  if (progress.uploaded === false && Date.now() < Date.parse(signed.expires_at)) {
    await transfer.send(signed)
    signal.throwIfAborted()
    progress.uploaded = true
  }

  await transfer.confirm(signed.object_id)
  signal.throwIfAborted()
}
