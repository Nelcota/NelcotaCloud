import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { CodeLanguage } from '@/shared/lib/highlight-code'
import { CodeBlock } from '@/shared/ui/code-block'
import { CopyButton } from '@/shared/ui/copy-button'

const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'

type ConnectAppPanelProps = {
  /** The full publishable key when one can be shown; otherwise a placeholder. */
  publishableKey: string | null
  projectId: string
}

/** The two steps that put this project's Auth into an app, with code that runs once pasted. */
export function ConnectAppPanel({ publishableKey, projectId }: ConnectAppPanelProps): JSX.Element {
  const snippet = sdkSnippet(publishableKey)

  return (
    <section className="bg-card rounded-xl border">
      <header className="border-b px-5 py-4">
        <h2>Conectar seu app</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Instale o SDK e use a publishable key do projeto. A secret key nunca vai para o app.
        </p>
      </header>
      <ol className="grid gap-5 p-5">
        <CodeStep step={1} label="Instale o SDK" code="npm install @nelcota/sdk" language="shell" />
        <CodeStep step={2} label="Crie o cliente" code={snippet} language="typescript" />
      </ol>
      <KeyHint publishableKey={publishableKey} projectId={projectId} />
    </section>
  )
}

function KeyHint({ publishableKey, projectId }: ConnectAppPanelProps): JSX.Element | null {
  if (publishableKey !== null) {
    return null
  }

  return (
    <p className="text-muted-foreground border-t px-5 py-3 text-sm text-pretty">
      Este projeto não tem publishable key que o console possa mostrar.{' '}
      <Link
        to="/projects/$projectId/keys"
        params={{ projectId }}
        className="text-primary-ink underline-offset-4 hover:underline"
      >
        Crie uma em Chaves de API
      </Link>{' '}
      e ela entra no código acima.
    </p>
  )
}

function sdkSnippet(publishableKey: string | null): string {
  const key = publishableKey ?? KEY_PLACEHOLDER

  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${API_BASE_URL}',`,
    `  publishableKey: '${key}',`,
    '})',
    '',
    'await nelcota.auth.signInWithPassword({ email, password })',
  ].join('\n')
}

type CodeStepProps = {
  step: number
  label: string
  code: string
  language: CodeLanguage
}

function CodeStep({ step, label, code, language }: CodeStepProps): JSX.Element {
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
      <CodeBlock code={code} language={language} />
    </li>
  )
}
