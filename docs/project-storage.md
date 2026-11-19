# Project Storage

Project Storage keeps files in a private Cloudflare R2 bucket. A single physical bucket per
environment contains the logical buckets shown on the console's **Arquivos** page. The control
plane stores the project-scoped catalog and atomically queues object cleanup when an object, bucket,
or project is deleted. File bodies travel directly between the client and R2.

## Setup

Create a private R2 bucket for the environment, separate from the backup bucket. Keep the public
development URL and public custom domains disabled. Create an R2 **Object Read & Write** token
scoped to this bucket. Add `STORAGE_R2_ENDPOINT`, `STORAGE_R2_BUCKET`, `STORAGE_R2_ACCESS_KEY_ID`,
and `STORAGE_R2_SECRET_ACCESS_KEY` to the API environment. The endpoint is the HTTPS S3 API
origin shown in R2. With all four settings unset, Storage is disabled. Changing the physical bucket
requires a verified copy and a coordinated catalog update. The catalog binds each file and its
cleanup job to the physical origin and bucket. An unexpected destination blocks transfers and
preserves cleanup jobs for their original location. If upgrading from the initial catalog,
verify the original physical destination, set `STORAGE_R2_ADOPT_LEGACY=true` for one startup,
and remove the flag after `/ops/storage/health` returns 200. It binds previously unbound rows.

Set the R2 CORS policy to allow the console and participating app origins. Allow **PUT** for browser
uploads and **GET** for browser code that fetches file bytes. Include **If-None-Match**,
**Content-Type**, **Content-Disposition**, and **Cache-Control** in the allowed upload headers. The
browser sets **Content-Length** from the Blob. Before enabling in production, test the signed PUT
from the supported browsers and verify the actual R2 endpoint rejects a changed length and a second
successful write to the same key.

## Access and transfers

- Console project members and the project's server-side secret key can manage buckets and all
  files in those buckets. A publishable key plus a signed-in project user's access token allows
  bucket discovery and file operations on files uploaded by that user. Bucket administration
  requires a project admin.
- Uploads use a create-only PUT valid for five minutes. Confirm the upload by `confirm_until`,
  fifteen minutes after the PUT expires. Confirmation validates the R2 metadata, then publishes
  the file at the top of the list. Files are paginated newest first.
- The per-file limit is 25 MiB. Confirmed files have a separate project quota of 1 GiB and 10,000
  files. Pending uploads have a project quota of 256 MiB and 64 files, and an additional limit of
  64 MiB and four files per signed-in project user. The quota of each class includes its queued
  objects until R2 confirms deletion. Each project can have up to 50 logical buckets.
- A signed download URL grants access for one minute to anyone holding it. Files are served as
  attachments with private, no-store caching. Treat signed URLs as credentials.
- Deletion hides the file immediately and queues removal from R2 after the upload URL's expiry
  and an additional grace period for in-flight uploads. The API's background task retries
  failed items in bounded batches of up to 250 and sweeps expired uploads even after a project
  is deleted. Deleting a project user queues all files they own and removes access to them.
  Existing download links expire within one minute. Project-owned files remain in the project.
- `/ops/storage/health` reports whether the configured provider can be reached with its credentials
  and whether the catalog matches its location. Monitor the internal endpoint from the API network.
  `/ready` continues to reflect database readiness.

The full API is available in the service's `/openapi.json`.

## TypeScript SDK

```ts
const buckets = await client.storage.listBuckets()
const files = await client.storage.listObjects(bucketId, { limit: 50 })
const uploaded = await client.storage.upload(bucketId, { name: file.name, file })
const download = await client.storage.downloadUrl(uploaded.id)
await client.storage.deleteObject(uploaded.id)
```

Use `files.next_cursor` as `before` to fetch the next page. If `upload` throws a
`StorageUploadInterruptedError`, call `client.storage.completeUpload(error.objectId)` to check
and confirm the same reservation before `error.confirmUntil`. For control over PUT retries, use
`client.storage.createUpload`, send the file with `putStorageObject`, and reuse the signed
reservation until its PUT deadline. Confirming again returns the existing record.

## Backup and recovery

Configure the backup service with a separate bucket-scoped **Object Read** token in
`STORAGE_BACKUP_SOURCE_ACCESS_KEY_ID` and `STORAGE_BACKUP_SOURCE_SECRET_ACCESS_KEY`. The backup
extracts the ready object inventory from the recovered PostgreSQL snapshot, copies just those
objects and their metadata into the encrypted backup, and verifies each copy before uploading
the completion marker. If an object is deleted during the backup and can no longer be read,
the backup is incomplete and the next scheduled run retries from a new snapshot.

To stage recovery of a snapshot with files, create an empty private target bucket with its own
**Object Read & Write** token. Pass `STORAGE_RESTORE_ENDPOINT`, `STORAGE_RESTORE_BUCKET`,
`STORAGE_RESTORE_ACCESS_KEY_ID`, and `STORAGE_RESTORE_SECRET_ACCESS_KEY` from the operator's
environment to the [restore command](deploy.md#5-backups-and-recovery) via Docker Compose `-e`
flags. The restore verifies the files and binds the recovered catalog to the new bucket. Set the
API's `STORAGE_R2_*` to the new bucket during cutover, then run the console lifecycle smoke test.
The backup retention period also applies to archived files that have since been deleted.
