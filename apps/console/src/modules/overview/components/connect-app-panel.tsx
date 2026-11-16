import type { JSX } from 'react'
import { useState } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { Button } from '@/shared/ui/button'

type ConnectAppPanelProps = {
  /** Last characters of an active publishable key, so the snippet says which key to paste. */
  publishableKeyHint: string | null
}

/** The two steps that put this project's Auth into an app, with code to copy. */
export function ConnectAppPanel({ publishableKeyHint }: ConnectAppPanelProps): JSX.Element {
  const snippet = sdkSnippet(publishableKeyHint)

  return (
    <section className="bg-card rounded-xl border">
      <header className="border-b px-5 py-4">
        <h2 className="font-semibold">Conectar seu app</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Instale o SDK e use a publishable key do projeto. A secret key nunca vai para o app.
        </p>
      </header>
      <div className="grid gap-4 p-5">
        <CodeBlock label="1. Instale" code="npm install @nelcota/sdk" />
        <CodeBlock label="2. Crie o cliente" code={snippet} />
      </div>
    </section>
  )
}

function sdkSnippet(publishableKeyHint: string | null): string {
  const keyPlaceholder = `nc_pk_…${publishableKeyHint ?? ''}`

  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${API_BASE_URL}',`,
    `  publishableKey: '${keyPlaceholder}', // a publishable key deste projeto`,
    '})',
    '',
    'await nelcota.auth.signInWithPassword({ email, password })',
  ].join('\n')
}

function CodeBlock({ label, code }: { label: string; code: string }): JSX.Element {
  const [isCopied, setIsCopied] = useState(false)

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(code)
    setIsCopied(true)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button variant="ghost" size="sm" onClick={copy}>
          <CopyLabel isCopied={isCopied} />
        </Button>
      </div>
      <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CopyLabel({ isCopied }: { isCopied: boolean }): JSX.Element {
  if (isCopied) {
    return <span>Copiado</span>
  }

  return <span>Copiar</span>
}
