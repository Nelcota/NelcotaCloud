const SAMPLE_PATH = '/webhooks/nelcota'
const SAMPLE_EVENT = 'user.created'

/** The same sample, addressed to one endpoint's path with one of its events. */
export function requestSample(path: string, eventType: string): string {
  return [
    `POST ${path}`,
    'content-type: application/json',
    'webhook-id: 0f8e2c4a-7b1d-4e3f-9a6c-2d5b8e1f4a7c',
    'webhook-timestamp: 1795353600',
    'webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4=',
    '',
    '{',
    `  "type": "${eventType}",`,
    '  "timestamp": "2026-11-22T12:00:00Z",',
    '  "data": { "user": { "id": "…", "email": "ana@exemplo.com" } }',
    '}',
  ].join('\n')
}

/** A delivery as the receiver gets it: the Standard Webhooks headers, then the JSON body. */
export const REQUEST_SAMPLE = requestSample(SAMPLE_PATH, SAMPLE_EVENT)

export const VERIFY_SAMPLE = [
  "import { verifyWebhook } from '@nelcota/sdk'",
  '',
  '// O corpo cru, como chegou: reserializar o JSON quebra a assinatura.',
  'const event = await verifyWebhook({',
  '  payload: rawBody,',
  '  headers: request.headers,',
  '  secret: process.env.NELCOTA_WEBHOOK_SECRET,',
  '})',
  '',
  '// Reenvios repetem o webhook-id: ignore os que já processou.',
].join('\n')
