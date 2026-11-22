import {
  clientLines,
  curlAuthLines,
  jsString,
  restUrl,
  shellQuote,
} from '@/modules/database/components/snippet-syntax'
import type { components } from '@/shared/api/api-schema'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

type SchemaOverview = components['schemas']['SchemaOverview']

/** Names the examples use before the project has its own table or function. */
const EXAMPLE_TABLE = 'notes'
const EXAMPLE_FUNCTION = 'minha_funcao'

type DatabaseSnippetsInput = { schema: SchemaOverview | undefined; publishableKey: string | null }

/** Reading a table and calling a function of `public`, named after the project's own. */
export function databaseSnippets({ schema, publishableKey }: DatabaseSnippetsInput): ApiSnippet[] {
  const table = schema?.tables.at(0)?.name ?? EXAMPLE_TABLE
  const functionName = schema?.functions.at(0)?.name ?? EXAMPLE_FUNCTION

  return [
    { label: 'SDK', title: 'app.ts', code: sdkSnippet(table, functionName, publishableKey) },
    { label: 'curl', title: 'shell', code: curlSnippet(table, functionName, publishableKey) },
  ]
}

function sdkSnippet(table: string, functionName: string, publishableKey: string | null): string {
  return [
    ...clientLines(publishableKey),
    '',
    '// Linhas que as políticas de RLS liberam para quem está logado',
    `const { data, error } = await nelcota.from(${jsString(table)}).select().execute()`,
    '',
    '// Função do schema public: os argumentos vão por nome',
    `const { data: result } = await nelcota.rpc(${jsString(functionName)}, {})`,
  ].join('\n')
}

function curlSnippet(table: string, functionName: string, publishableKey: string | null): string {
  const auth = curlAuthLines(publishableKey)
  const functionPath = `rpc/${encodeURIComponent(functionName)}`

  return [
    '# Sem Authorization, o pedido roda como anon',
    `curl ${shellQuote(restUrl(`${encodeURIComponent(table)}?select=*`))} \\`,
    ...auth,
    '',
    '# Chamar uma função',
    `curl -X POST ${shellQuote(restUrl(functionPath))} \\`,
    "  -H 'Content-Type: application/json' \\",
    "  -d '{}' \\",
    ...auth,
  ].join('\n')
}
