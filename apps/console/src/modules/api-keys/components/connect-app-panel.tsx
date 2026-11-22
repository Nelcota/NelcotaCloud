import type { JSX } from 'react'

import { ConnectSnippetTabs } from '@/modules/api-keys/components/connect-snippet-tabs'
import { Section } from '@/shared/ui/section'

type ConnectAppPanelProps = {
  /** The full publishable key when one can be shown; otherwise a placeholder. */
  publishableKey: string | null
  projectId: string
}

/** From install to verifying tokens on the server, one tab per step. */
export function ConnectAppPanel({ publishableKey, projectId }: ConnectAppPanelProps): JSX.Element {
  return (
    <Section title="Conectar seu app" description="SDK @nelcota/sdk, já com os dados do projeto.">
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <ConnectSnippetTabs publishableKey={publishableKey} projectId={projectId} />
      </div>
    </Section>
  )
}
