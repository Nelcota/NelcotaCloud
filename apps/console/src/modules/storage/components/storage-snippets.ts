import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'
const BUCKET_PLACEHOLDER = 'BUCKET_ID'

type StorageSnippetsInput = { bucketId: string | null; publishableKey: string | null }

/** List, upload, download and delete as the signed-in user, with the bucket on screen. */
export function storageSnippets({ bucketId, publishableKey }: StorageSnippetsInput): ApiSnippet[] {
  const bucket = bucketId ?? BUCKET_PLACEHOLDER
  const key = publishableKey ?? KEY_PLACEHOLDER

  return [
    { label: 'SDK', title: 'app.ts', code: sdkSnippet(bucket, key) },
    { label: 'HTTP', title: 'shell', code: curlSnippet(bucket, key) },
  ]
}

function sdkSnippet(bucket: string, key: string): string {
  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    `const nelcota = createClient({ url: '${API_BASE_URL}', publishableKey: '${key}' })`,
    `const bucketId = '${bucket}'`,
    '',
    '// Com o usuário logado',
    'const buckets = await nelcota.storage.listBuckets()',
    'const files = await nelcota.storage.listObjects(bucketId, { limit: 50 })',
    'const uploaded = await nelcota.storage.upload(bucketId, { name: file.name, file })',
    'const url = await nelcota.storage.downloadUrl(uploaded.id) // link curto e assinado',
    'await nelcota.storage.deleteObject(uploaded.id)',
    '',
    '// Próxima página: listObjects(bucketId, { before: files.next_cursor })',
  ].join('\n')
}

function curlSnippet(bucket: string, key: string): string {
  const base = `${API_BASE_URL}/storage/v1`
  const auth = [`  -H 'apikey: ${key}' \\`, '  -H "Authorization: Bearer $ACCESS_TOKEN"']
  const json = "  -H 'Content-Type: application/json' \\"

  return [
    '# Listar arquivos do bucket',
    `curl '${base}/buckets/${bucket}/objects?limit=50' \\`,
    ...auth,
    '',
    '# Enviar: 1) reservar, 2) PUT na url com os headers devolvidos, 3) confirmar',
    `curl -X POST '${base}/buckets/${bucket}/uploads' \\`,
    json,
    `  -d '{"name":"foto.png","content_type":"image/png","size_bytes":1024}' \\`,
    ...auth,
    '',
    `curl -X POST "${base}/objects/$OBJECT_ID/complete" \\`,
    ...auth,
    '',
    '# Baixar: devolve { url } assinada e de curta duração',
    `curl -X POST "${base}/objects/$OBJECT_ID/download-url" \\`,
    ...auth,
    '',
    '# Excluir',
    `curl -X DELETE "${base}/objects/$OBJECT_ID" \\`,
    ...auth,
  ].join('\n')
}
