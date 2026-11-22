import type { JSX, ReactNode } from 'react'

import { ConnectionValues } from '@/modules/overview/components/connection-values'
import { envSnippet, sdkSnippet, curlSnippet } from '@/modules/overview/components/connect-snippets'
import { useAiContext } from '@/modules/overview/queries/use-ai-context'
import { CodeBlock } from '@/shared/ui/code-block'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** What an app needs to talk to this project: its values and the first lines of code. */
export function ConnectAppPanel({ projectId }: { projectId: string }): JSX.Element {
  const { context, error, retry } = useAiContext(projectId)

  if (context === null) {
    return (
      <PanelFrame>
        <LoadError error={error} onRetry={retry} />
        {error === null && <Skeleton className="h-72" />}
      </PanelFrame>
    )
  }

  const snippets = [
    { label: 'SDK', title: 'nelcota.ts', code: sdkSnippet(context) },
    { label: 'curl', title: 'bash', code: curlSnippet(context) },
    { label: '.env', title: '.env', code: envSnippet(context) },
  ]

  return (
    <PanelFrame>
      <ConnectionValues context={context} />
      <Tabs defaultValue="SDK" className="gap-3">
        <TabsList variant="line">
          {snippets.map((snippet) => (
            <TabsTrigger key={snippet.label} value={snippet.label}>
              {snippet.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {snippets.map((snippet) => (
          <TabsContent key={snippet.label} value={snippet.label}>
            <CodeBlock code={snippet.code} title={snippet.title} copyLabel={snippet.title} />
          </TabsContent>
        ))}
      </Tabs>
    </PanelFrame>
  )
}

function PanelFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <section
      aria-labelledby="connect-app-title"
      className="@container flex min-w-0 flex-col gap-4 rounded-xl border border-border/60 bg-card p-4"
    >
      <h2 id="connect-app-title" className="text-base font-medium text-heading">
        Conectar seu app
      </h2>
      {children}
    </section>
  )
}
