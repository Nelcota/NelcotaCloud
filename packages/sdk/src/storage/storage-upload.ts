import { NelcotaError } from '../http/nelcota-error'
import type { StorageFile, StorageFileInput, StorageUpload } from './storage-types'

/** Converts a browser file or server-side Blob to the metadata signed by the API. */
export function storageFileInput({ name, file, requestId }: StorageFile): StorageFileInput {
  return {
    name,
    size_bytes: file.size,
    content_type: file.type.split(';')[0]?.trim() || 'application/octet-stream',
    ...(requestId === undefined ? {} : { request_id: requestId }),
  }
}

/** Sends an upload straight to R2 with only the signed headers and the file. */
export async function putStorageObject(
  upload: StorageUpload,
  file: Blob,
  send: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<void> {
  const headers = new Headers(upload.headers)
  const size = headers.get('content-length')

  if (size !== String(file.size)) {
    throw uploadError(400, 'The file size does not match the signed upload.')
  }

  if (upload.can_upload === false) {
    return verifyExistingUpload(upload, file, send)
  }

  // A Blob lets the browser set Content-Length, which script cannot set itself.
  headers.delete('content-length')
  const response = await send(upload.url, {
    method: 'PUT',
    headers,
    body: file,
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  }).catch(() => {
    throw uploadError(0, 'The file could not be sent to object storage.')
  })

  if (response.status === 412) {
    return verifyExistingUpload(upload, file, send)
  }

  if (response.ok === false) {
    throw uploadError(response.status, 'Object storage rejected the file upload.')
  }
}

async function verifyExistingUpload(
  upload: StorageUpload,
  file: Blob,
  send: typeof fetch,
): Promise<void> {
  if (typeof upload.verification_url !== 'string') {
    throw uploadError(412, 'Object storage already has a file for this upload.')
  }

  const response = await send(upload.verification_url, {
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  }).catch(() => {
    throw uploadError(0, 'The previous upload could not be verified.')
  })

  if (response.status === 404 && upload.can_upload === false) {
    throw new NelcotaError({
      status: 409,
      code: 'storage_upload_expired',
      message: 'The upload expired before the file arrived.',
      requestId: null,
    })
  }

  if (response.ok === false) {
    throw uploadError(response.status, 'The previous upload could not be verified.')
  }

  const [stored, selected] = await Promise.all([response.arrayBuffer(), file.arrayBuffer()]).catch(
    () => {
      throw uploadError(0, 'The previous upload could not be read for verification.')
    },
  )
  const previous = new Uint8Array(stored)
  const expected = new Uint8Array(selected)

  if (
    previous.length !== expected.length ||
    previous.every((byte, index) => byte === expected[index]) === false
  ) {
    throw uploadError(412, 'The stored file does not match the selected file.')
  }
}

function uploadError(status: number, message: string): NelcotaError {
  return new NelcotaError({ status, code: 'storage_upload_failed', message, requestId: null })
}
