import type { JSX } from 'react'

import { ConnectSnippetTabs } from '@/modules/api-keys/components/connect-snippet-tabs'
import { SettingsSection } from '@/shared/ui/settings-section'

type ConnectAppPanelProps = {
  /** The full publishable key when one can be shown; otherwise a placeholder. */
  publishableKey: string | null
  projectId: string
}

/** From install to verifying tokens on the server, one tab per step. */
export function ConnectAppPanel({ publishableKey, projectId }: ConnectAppPanelProps): JSX.Element {
  return (
    <SettingsSection
      title="Conectar seu app"
      description="SDK @nelcota/sdk, já com os dados do projeto."
    >
      <ConnectSnippetTabs publishableKey={publishableKey} projectId={projectId} />
    </SettingsSection>
  )
}
