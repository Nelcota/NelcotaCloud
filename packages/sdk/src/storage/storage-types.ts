import type { components } from '../generated/api-schema'

export type StorageBucket = components['schemas']['Bucket']
export type StorageObject = components['schemas']['StorageObject']
export type StorageObjectPage = components['schemas']['ObjectPage']
export type StorageUpload = components['schemas']['SignedUpload']
export type StorageDownload = components['schemas']['SignedDownload']
export type StorageFileInput = components['schemas']['FileInput']

export type StoragePageOptions = { limit?: number; before?: string }
export type StorageFile = { name: string; file: Blob }
