import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { CopyButton } from '@/shared/ui/copy-button'

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
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Instale o SDK e use a publishable key do projeto. A secret key nunca vai para o app.
        </p>
      </header>
      <ol className="grid gap-5 p-5">
        <CodeStep step={1} label="Instale o SDK" code="npm install @nelcota/sdk" />
        <CodeStep step={2} label="Crie o cliente" code={snippet} />
      </ol>
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

type CodeStepProps = {
  step: number
  label: string
  code: string
}

function CodeStep({ step, label, code }: CodeStepProps): JSX.Element {
  return (
    <li className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <span className="bg-secondary text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
            {step}
          </span>
          {label}
        </span>
        <CopyButton value={code} description={label} />
      </div>
      <pre className="bg-muted/60 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </li>
  )
}
