import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { ApiSheet } from '@/shared/ui/api-sheet'

const CURL_SNIPPET = [
  '# Servidor ou CI: nunca coloque a secret key no app',
  `curl -X POST '${API_BASE_URL}/database/v1/sql' \\`,
  '  -H "apikey: $NELCOTA_SECRET_KEY" \\',
  "  -H 'Content-Type: application/json' \\",
  `  -d '{"query": "select now();"}'`,
  '',
  '# Resposta: { columns, rows, row_count, rows_affected, is_truncated }',
].join('\n')

const HTTP_SNIPPET = [
  'POST /database/v1/sql HTTP/1.1',
  `Host: ${new URL(API_BASE_URL).host}`,
  'apikey: $NELCOTA_SECRET_KEY',
  'Content-Type: application/json',
  '',
  '{ "query": "select now();" }',
].join('\n')

/** The same endpoint the editor calls, for scripts that run SQL with the secret key. */
export function SqlApiSheet(): JSX.Element | null {
  return (
    <ApiSheet
      title="SQL pela API"
      description="Roda as instruções como nelcota_developer, numa transação. Só com a secret key, no servidor."
      snippets={[
        { label: 'curl', title: 'shell', code: CURL_SNIPPET },
        { label: 'HTTP', title: 'http', code: HTTP_SNIPPET },
      ]}
    />
  )
}
