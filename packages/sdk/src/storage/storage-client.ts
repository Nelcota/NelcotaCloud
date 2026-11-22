import { authorizedRequest } from '../http/authorized-request'
import type { AccessTokenSource, AuthorizedContext } from '../http/authorized-request'
import type { HttpClient } from '../http/http-client'
import { NelcotaError } from '../http/nelcota-error'
import type {
  StorageBucket,
  StorageDownload,
  StorageFile,
  StorageFileInput,
  StorageObject,
  StorageObjectPage,
  StoragePageOptions,
  StorageUpload,
} from './storage-types'
import { putStorageObject, storageFileInput } from './storage-upload'

const BUCKETS = '/storage/v1/buckets'
const OBJECTS = '/storage/v1/objects'

/** Private project files, scoped to the signed-in user. */
export class StorageClient {
  private readonly context: AuthorizedContext
  private readonly fetchFunction: typeof fetch
  private readonly uploadIds = new WeakMap<Blob, Map<string, string>>()

  constructor(http: HttpClient, session: AccessTokenSource, fetchFunction: typeof fetch) {
    this.context = { http, manager: session }
    this.fetchFunction = fetchFunction
  }

  listBuckets(): Promise<StorageBucket[]> {
    return authorizedRequest(this.context, { method: 'GET', path: BUCKETS })
  }

  listObjects(bucketId: string, page: StoragePageOptions = {}): Promise<StorageObjectPage> {
    const params = new URLSearchParams()

    if (page.limit !== undefined) {
      params.set('limit', String(page.limit))
    }

    if (page.before !== undefined) {
      params.set('before', page.before)
    }

    return authorizedRequest(this.context, {
      method: 'GET',
      path: `${bucketPath(bucketId)}/objects?${params}`,
    })
  }

  async upload(bucketId: string, file: StorageFile): Promise<StorageObject> {
    const ids = this.uploadIds.get(file.file) ?? new Map<string, string>()
    const key = JSON.stringify([bucketId, file.name])
    const requestId = file.requestId ?? ids.get(key) ?? globalThis.crypto.randomUUID()

    if (file.requestId === undefined) {
      ids.set(key, requestId)
      this.uploadIds.set(file.file, ids)
    }

    try {
      const upload = await this.createUpload(bucketId, storageFileInput({ ...file, requestId }))
      await putStorageObject(upload, file.file, this.fetchFunction)
      const object = await this.completeUpload(upload.object_id)
      this.forgetUpload(ids, key, requestId)

      return object
    } catch (error) {
      if (error instanceof NelcotaError && error.code === 'storage_upload_expired') {
        this.forgetUpload(ids, key, requestId)
      }

      throw error
    }
  }

  private forgetUpload(ids: Map<string, string>, key: string, requestId: string): void {
    if (ids.get(key) === requestId) {
      ids.delete(key)
    }
  }

  createUpload(bucketId: string, input: StorageFileInput): Promise<StorageUpload> {
    return authorizedRequest(this.context, {
      method: 'POST',
      path: `${bucketPath(bucketId)}/uploads`,
      body: input,
    })
  }

  completeUpload(objectId: string): Promise<StorageObject> {
    return authorizedRequest(this.context, {
      method: 'POST',
      path: `${objectPath(objectId)}/complete`,
    })
  }

  async downloadUrl(objectId: string): Promise<string> {
    const result = await authorizedRequest<StorageDownload>(this.context, {
      method: 'POST',
      path: `${objectPath(objectId)}/download-url`,
    })

    return result.url
  }

  deleteObject(objectId: string): Promise<void> {
    return authorizedRequest(this.context, { method: 'DELETE', path: objectPath(objectId) })
  }
}

function bucketPath(bucketId: string): string {
  return `${BUCKETS}/${encodeURIComponent(bucketId)}`
}

function objectPath(objectId: string): string {
  return `${OBJECTS}/${encodeURIComponent(objectId)}`
}
