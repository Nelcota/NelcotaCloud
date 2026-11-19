import type { HttpClient, HttpRequest } from '../http/http-client'
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
import { StorageUploadInterruptedError } from './storage-upload-interrupted-error'
import { putStorageObject, storageFileInput } from './storage-upload'

const BUCKETS = '/storage/v1/buckets'
const OBJECTS = '/storage/v1/objects'

type StorageSession = { accessToken(): Promise<string> }

/** Private project files, scoped to the signed-in user. */
export class StorageClient {
  private readonly http: HttpClient
  private readonly session: StorageSession
  private readonly fetchFunction: typeof fetch

  constructor(http: HttpClient, session: StorageSession, fetchFunction: typeof fetch) {
    this.http = http
    this.session = session
    this.fetchFunction = fetchFunction
  }

  listBuckets(): Promise<StorageBucket[]> {
    return this.request({ method: 'GET', path: BUCKETS })
  }

  listObjects(bucketId: string, page: StoragePageOptions = {}): Promise<StorageObjectPage> {
    const params = new URLSearchParams()

    if (page.limit !== undefined) {
      params.set('limit', String(page.limit))
    }

    if (page.before !== undefined) {
      params.set('before', page.before)
    }

    return this.request({
      method: 'GET',
      path: `${bucketPath(bucketId)}/objects?${params}`,
    })
  }

  async upload(bucketId: string, file: StorageFile): Promise<StorageObject> {
    const upload = await this.createUpload(bucketId, storageFileInput(file))
    try {
      await putStorageObject(upload, file.file, this.fetchFunction)

      return await this.completeUpload(upload.object_id)
    } catch (cause) {
      throw new StorageUploadInterruptedError(upload, cause)
    }
  }

  createUpload(bucketId: string, input: StorageFileInput): Promise<StorageUpload> {
    return this.request({ method: 'POST', path: `${bucketPath(bucketId)}/uploads`, body: input })
  }

  completeUpload(objectId: string): Promise<StorageObject> {
    return this.request({ method: 'POST', path: `${objectPath(objectId)}/complete` })
  }

  async downloadUrl(objectId: string): Promise<string> {
    const result = await this.request<StorageDownload>({
      method: 'POST',
      path: `${objectPath(objectId)}/download-url`,
    })

    return result.url
  }

  deleteObject(objectId: string): Promise<void> {
    return this.request({ method: 'DELETE', path: objectPath(objectId) })
  }

  private async request<T>(request: HttpRequest): Promise<T> {
    const accessToken = await this.session.accessToken()

    return this.http.request<T>({ ...request, accessToken })
  }
}

function bucketPath(bucketId: string): string {
  return `${BUCKETS}/${encodeURIComponent(bucketId)}`
}

function objectPath(objectId: string): string {
  return `${OBJECTS}/${encodeURIComponent(objectId)}`
}
