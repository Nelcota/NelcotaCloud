import { snippetKeyOf } from '@/modules/project-settings/components/snippet-key'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

/** Connecting an app to the project, and checking the API answers. */
export function settingsApiSnippets(publishableKey: string | null): ApiSnippet[] {
  const key = snippetKeyOf(publishableKey)

  return [
    { label: 'SDK', title: 'nelcota.ts', code: clientSnippet(key) },
    { label: 'curl', title: 'shell', code: curlSnippet(key) },
  ]
}

function clientSnippet(key: string): string {
  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${API_BASE_URL}',`,
    `  publishableKey: '${key}',`,
    '})',
  ].join('\n')
}

function curlSnippet(key: string): string {
  return [
    '# A API está no ar? Responde "ok".',
    `curl ${API_BASE_URL}/health`,
    '',
    '# Chaves públicas que assinam os access tokens do projeto',
    `curl ${API_BASE_URL}/auth/v1/jwks \\`,
    `  -H "apikey: ${key}"`,
  ].join('\n')
}
