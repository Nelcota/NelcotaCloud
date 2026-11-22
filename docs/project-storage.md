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
after enabling Storage requires moving existing objects and pending cleanup targets first.

Set the R2 CORS policy to allow the console and participating app origins. Allow **PUT** for browser
uploads and **GET** for browser code that fetches file bytes. Include **If-None-Match**,
**Content-Type**, **Content-Disposition**, and **Cache-Control** in the allowed upload headers. The
browser sets **Content-Length** from the Blob. The console downloads files and verifies resumed
uploads with signed GET requests. Before enabling in production, test signed transfers from the
supported browsers. The staged R2 test checks that the provider rejects a different content length,
refuses a second PUT and leaves a missing object unconfirmed.

## Access and transfers

- Console project members and the project's server-side secret key can manage buckets and all
  files in those buckets. A publishable key plus a signed-in project user's access token allows
  bucket discovery and file operations on files uploaded by that user. Bucket administration
  requires a project admin.
- Uploads reserve quota and return a create-only PUT signed for five minutes. Complete the upload
  to validate object metadata and list it. An upload that reached R2 can be confirmed for another
  15 minutes after the PUT expires. The initial limits are 25 MiB per file, 1 GiB and 10,000 files
  per project, and 50 logical buckets per project. Pending uploads and queued cleanup count
  against the project quota.
- A signed download URL grants access for one minute to anyone holding it. Files are served as
  attachments with private, no-store caching. Treat signed URLs as credentials.
- Deletion hides the file immediately and queues removal from R2 after the upload URL's expiry
  and an additional grace period for in-flight uploads. The API's background task retries
  failed deletions and sweeps expired uploads even after a project is deleted.
- Deleting a project user queues removal of that user's files. The cleanup worker waits for
  authorized uploads already in flight, removes the files from the catalog, and queues the same
  R2 deletion process. Quota is released as physical cleanup succeeds.
- PostgreSQL backups include the catalog. File bytes remain in R2 and need a separate recovery
  strategy.

The full API is available in the service's `/openapi.json`.

## TypeScript SDK

```ts
const buckets = await client.storage.listBuckets()
const files = await client.storage.listObjects(bucketId, { limit: 50 })
const uploaded = await client.storage.upload(bucketId, { name: file.name, file })
const download = await client.storage.downloadUrl(uploaded.id)
await client.storage.deleteObject(uploaded.id)
```

Use `files.next_cursor` as `before` to fetch the next page. When retrying `upload`, reuse the same
Blob and client instance, or supply the same `requestId` UUID with the same file metadata. This
reuses the reservation and verifies an existing object's bytes if needed. Use a new request ID
for a new upload after the API reports `storage_upload_expired`.

For custom transfers, use `client.storage.createUpload` with a `request_id` UUID, send the file
with `putStorageObject`, and call `client.storage.completeUpload` with the returned ID. The SDK
can use the signed `verification_url` when a stored file needs checking. `can_upload` tells the
client whether it can still send a PUT. Repeating a successful confirmation returns the existing
record.
