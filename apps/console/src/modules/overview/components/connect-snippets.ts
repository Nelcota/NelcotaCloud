import type { AiContext } from '@/modules/overview/components/ai-context'

/** Shown where the console has no publishable key to fill in. */
export const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'

export type ConnectionValues = Pick<AiContext, 'apiUrl' | 'publishableKey' | 'projectId' | 'tables'>

export function jwksUrlOf(apiUrl: string): string {
  return `${apiUrl}/auth/v1/jwks`
}

export function sdkSnippet(values: ConnectionValues): string {
  const key = values.publishableKey ?? KEY_PLACEHOLDER

  return [
    '// npm install @nelcota/sdk',
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${values.apiUrl}',`,
    `  publishableKey: '${key}',`,
    '})',
  ].join('\n')
}

/** A public read: the first table of the project, or the captcha route when it has none. */
export function curlSnippet(values: ConnectionValues): string {
  const key = values.publishableKey ?? KEY_PLACEHOLDER
  const table = values.tables?.find((candidate) => candidate.kind === 'table')
  const url = publicUrlOf(values.apiUrl, table?.name)

  return [`curl "${url}" \\`, `  -H "apikey: ${key}"`].join('\n')
}

export function envSnippet(values: ConnectionValues): string {
  const key = values.publishableKey ?? KEY_PLACEHOLDER

  return [
    `NELCOTA_URL=${values.apiUrl}`,
    `NELCOTA_PUBLISHABLE_KEY=${key}`,
    `NELCOTA_PROJECT_ID=${values.projectId}`,
  ].join('\n')
}

/** The project's public keys, for servers that verify access tokens themselves. */
export function jwksSnippet(values: ConnectionValues): string {
  const key = values.publishableKey ?? KEY_PLACEHOLDER

  return [
    `const response = await fetch('${jwksUrlOf(values.apiUrl)}', {`,
    `  headers: { apikey: '${key}' },`,
    '})',
    'const { keys } = await response.json() // Ed25519 (EdDSA) public keys',
  ].join('\n')
}

function publicUrlOf(apiUrl: string, table: string | undefined): string {
  if (table === undefined) {
    return `${apiUrl}/auth/v1/captcha`
  }

  return `${apiUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=10`
}
