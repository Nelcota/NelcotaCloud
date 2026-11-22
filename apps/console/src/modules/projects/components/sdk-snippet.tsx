import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { CodeBlock } from '@/shared/ui/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

type Snippet = { id: string; label: string; title: string; code: string }

/** Installing the SDK, creating its client and the env file with this project's public values. */
export function SdkSnippet({ publishableKey }: { publishableKey: string }): JSX.Element {
  const snippets = snippetsFor(publishableKey)

  return (
    <Tabs defaultValue="install" className="gap-3">
      <TabsList variant="line">
        {snippets.map((snippet) => (
          <TabsTrigger key={snippet.id} value={snippet.id}>
            {snippet.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {snippets.map((snippet) => (
        <TabsContent key={snippet.id} value={snippet.id}>
          <CodeBlock title={snippet.title} copyLabel={snippet.title} code={snippet.code} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function snippetsFor(publishableKey: string): readonly Snippet[] {
  return [
    { id: 'install', label: 'Instalar', title: 'Terminal', code: 'npm i @nelcota/sdk' },
    { id: 'client', label: 'Cliente', title: 'src/nelcota.ts', code: CLIENT_SNIPPET },
    { id: 'env', label: '.env', title: '.env.local', code: envSnippet(publishableKey) },
  ]
}

const CLIENT_SNIPPET = [
  "import { createClient } from '@nelcota/sdk'",
  '',
  'export const nelcota = createClient({',
  '  url: import.meta.env.VITE_NELCOTA_URL,',
  '  publishableKey: import.meta.env.VITE_NELCOTA_PUBLISHABLE_KEY,',
  '})',
].join('\n')

function envSnippet(publishableKey: string): string {
  return [
    `VITE_NELCOTA_URL=${API_BASE_URL}`,
    `VITE_NELCOTA_PUBLISHABLE_KEY=${publishableKey}`,
  ].join('\n')
}
