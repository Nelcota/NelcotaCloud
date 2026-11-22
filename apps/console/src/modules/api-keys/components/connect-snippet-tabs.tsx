import type { JSX } from 'react'

import { connectSteps } from '@/modules/api-keys/components/connect-snippets'
import { CodeBlock } from '@/shared/ui/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

type ConnectSnippetTabsProps = {
  /** The full publishable key when one can be shown; otherwise a placeholder. */
  publishableKey: string | null
  projectId: string
}

/** The SDK steps one at a time, so the panel stays short; the tabs keep their order. */
export function ConnectSnippetTabs({
  publishableKey,
  projectId,
}: ConnectSnippetTabsProps): JSX.Element {
  const steps = connectSteps(publishableKey, projectId)

  return (
    <Tabs defaultValue="install" className="gap-3">
      <TabsList variant="line" aria-label="Passos para conectar">
        {steps.map((step) => (
          <TabsTrigger key={step.id} value={step.id} className="flex-none px-2.5">
            {step.tab}
          </TabsTrigger>
        ))}
      </TabsList>
      {steps.map((step) => (
        <TabsContent key={step.id} value={step.id}>
          <CodeBlock code={step.code} title={step.label} copyLabel={step.label} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
