import { PUBLISHABLE_PLACEHOLDER } from '@/modules/api-keys/components/project-endpoints'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

/** How keys travel in requests and how to manage them, with the project's real values. */
export function keyApiSnippets(publishableKey: string | null): ApiSnippet[] {
  const key = publishableKey ?? PUBLISHABLE_PLACEHOLDER

  return [
    { label: 'Headers', title: 'curl', code: headersSnippet(key) },
    { label: 'Gerenciar', title: 'curl', code: manageSnippet() },
    { label: 'SDK', title: 'nelcota.ts', code: clientSnippet(key) },
  ]
}

function headersSnippet(key: string): string {
  return [
    '# App: chave publicável no header apikey, mais o token do usuário logado',
    `curl "${API_BASE_URL}/rest/v1/notes?select=*" \\`,
    `  -H "apikey: ${key}" \\`,
    '  -H "Authorization: Bearer $ACCESS_TOKEN"',
    '',
    '# Servidor: chave secreta no mesmo header; ignora RLS, nunca vai para o app',
    `curl "${API_BASE_URL}/rest/v1/notes?select=*" \\`,
    '  -H "apikey: $NELCOTA_SECRET_KEY"',
  ].join('\n')
}

function manageSnippet(): string {
  return [
    '# Listar (ativas primeiro; x-nelcota-next-cursor pagina as revogadas)',
    `curl "${API_BASE_URL}/auth/v1/admin/api-keys" \\`,
    '  -H "apikey: $NELCOTA_SECRET_KEY"',
    '',
    '# Criar: kind "publishable" ou "secret" (o valor da secreta volta só aqui)',
    `curl -X POST "${API_BASE_URL}/auth/v1/admin/api-keys" \\`,
    '  -H "apikey: $NELCOTA_SECRET_KEY" \\',
    '  -H "content-type: application/json" \\',
    '  -d \'{"kind":"publishable","name":"App iOS"}\'',
    '',
    '# Revogar',
    `curl -X DELETE "${API_BASE_URL}/auth/v1/admin/api-keys/$KEY_ID" \\`,
    '  -H "apikey: $NELCOTA_SECRET_KEY"',
    '',
    '# Rotacionar a chave de assinatura dos tokens',
    `curl -X POST "${API_BASE_URL}/auth/v1/admin/signing-keys/rotate" \\`,
    '  -H "apikey: $NELCOTA_SECRET_KEY"',
  ].join('\n')
}

function clientSnippet(key: string): string {
  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    '// O SDK envia apikey e Authorization em cada requisição',
    'export const nelcota = createClient({',
    `  url: '${API_BASE_URL}',`,
    `  publishableKey: '${key}',`,
    '})',
  ].join('\n')
}
