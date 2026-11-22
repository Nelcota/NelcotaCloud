import { REQUEST_SAMPLE } from '@/modules/webhooks/components/webhook-samples'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

const ADMIN = `${API_BASE_URL}/auth/v1/admin/webhooks`

/** Receiving (verification), managing endpoints over HTTP, and what a delivery looks like. */
export function webhookApiSnippets(): ApiSnippet[] {
  return [
    { label: 'Verificar', title: 'server.ts', code: RECEIVER_SNIPPET },
    { label: 'Gerenciar', title: 'curl', code: MANAGE_SNIPPET },
    { label: 'Requisição', title: 'HTTP', code: REQUEST_SAMPLE },
  ]
}

const RECEIVER_SNIPPET = [
  "import express from 'express'",
  "import { verifyWebhook, WebhookVerificationError } from '@nelcota/sdk'",
  '',
  'const app = express()',
  '',
  '// O corpo cru, como chegou: reserializar o JSON quebra a assinatura.',
  "app.post('/webhooks/nelcota', express.text({ type: '*/*' }), async (req, res) => {",
  '  try {',
  '    const event = await verifyWebhook({',
  '      payload: req.body,',
  '      headers: req.headers,',
  '      secret: process.env.NELCOTA_WEBHOOK_SECRET,',
  '    })',
  '',
  '    // Reenvios repetem o webhook-id: ignore os que já processou.',
  "    if (event.type === 'user.created') {",
  '      // event.data.user',
  '    }',
  '',
  '    res.sendStatus(204) // 2xx em até 10 s',
  '  } catch (error) {',
  '    if (error instanceof WebhookVerificationError) return res.sendStatus(400)',
  '    throw error',
  '  }',
  '})',
].join('\n')

const MANAGE_SNIPPET = [
  '# Listar endpoints',
  `curl "${ADMIN}" -H "apikey: $NELCOTA_SECRET_KEY"`,
  '',
  '# Criar (o segredo whsec_… volta só nesta resposta)',
  `curl -X POST "${ADMIN}" \\`,
  '  -H "apikey: $NELCOTA_SECRET_KEY" \\',
  '  -H "content-type: application/json" \\',
  '  -d \'{"url":"https://api.exemplo.com/webhooks/nelcota","event_types":["user.created"]}\'',
  '',
  '# Pausar ou trocar eventos (só os campos enviados mudam)',
  `curl -X PATCH "${ADMIN}/$ENDPOINT_ID" \\`,
  '  -H "apikey: $NELCOTA_SECRET_KEY" \\',
  '  -H "content-type: application/json" \\',
  '  -d \'{"is_enabled":false}\'',
  '',
  '# Últimas 50 entregas e reenvio de uma',
  `curl "${ADMIN}/$ENDPOINT_ID/deliveries" -H "apikey: $NELCOTA_SECRET_KEY"`,
  `curl -X POST "${ADMIN}/$ENDPOINT_ID/deliveries/$DELIVERY_ID/retry" \\`,
  '  -H "apikey: $NELCOTA_SECRET_KEY"',
  '',
  '# Evento de teste e novo segredo (o anterior assina por mais 24 h)',
  `curl -X POST "${ADMIN}/$ENDPOINT_ID/test" -H "apikey: $NELCOTA_SECRET_KEY"`,
  `curl -X POST "${ADMIN}/$ENDPOINT_ID/secret" -H "apikey: $NELCOTA_SECRET_KEY"`,
].join('\n')
