import { NelcotaError } from '../http/nelcota-error'
import type { StorageFile } from './storage-types'
import type { StorageFileInput, StorageUpload } from './storage-types'

/** Converts a browser file or server-side Blob to the metadata signed by the API. */
export function storageFileInput({ name, file }: StorageFile): StorageFileInput {
  return {
    name,
    size_bytes: file.size,
    content_type: file.type.split(';')[0] || 'application/octet-stream',
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

  if (response.ok === false && response.status !== 412) {
    throw uploadError(response.status, 'Object storage rejected the file upload.')
  }
}

function uploadError(status: number, message: string): NelcotaError {
  return new NelcotaError({ status, code: 'storage_upload_failed', message, requestId: null })
}
