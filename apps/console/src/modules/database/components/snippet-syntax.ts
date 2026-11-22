import { API_BASE_URL } from '@/shared/api/api-base-url'

/** Shown in place of the key when the console cannot show a publishable key. */
const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'

/** A string literal for the TypeScript snippets, with the quotes inside escaped. */
export function jsString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

/** A shell argument in single quotes, safe for any text (`'` becomes `'\''`). */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

export function restUrl(path: string): string {
  return `${API_BASE_URL}/rest/v1/${path}`
}

/** The lines that create the SDK client every TypeScript snippet starts with. */
export function clientLines(publishableKey: string | null): string[] {
  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    'const nelcota = createClient({',
    `  url: ${jsString(API_BASE_URL)},`,
    `  publishableKey: ${jsString(keyOf(publishableKey))},`,
    '})',
  ]
}

/**
 * The headers of a Data API request as a user: the publishable key and the user's access token.
 * Without `Authorization` the request runs as `nelcota_anon`.
 */
export function curlAuthLines(publishableKey: string | null): string[] {
  return [
    `  -H ${shellQuote(`apikey: ${keyOf(publishableKey)}`)} \\`,
    '  -H "Authorization: Bearer $ACCESS_TOKEN"',
  ]
}

function keyOf(publishableKey: string | null): string {
  return publishableKey ?? KEY_PLACEHOLDER
}
