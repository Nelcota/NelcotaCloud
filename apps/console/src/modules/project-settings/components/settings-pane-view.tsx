import { useId, type JSX, type ReactNode } from 'react'

import type { SettingsPane } from '@/modules/project-settings/components/settings-panes'
import { cn } from '@/shared/lib/utils'

type SettingsPaneViewProps = {
  pane: SettingsPane
  children: ReactNode
}

/** The open pane: its title and one line, then its groups. */
export function SettingsPaneView({ pane, children }: SettingsPaneViewProps): JSX.Element {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-0.5">
        <h2
          id={titleId}
          className={cn(
            'text-xl font-semibold tracking-tight text-heading',
            pane.isDanger === true && 'text-destructive',
          )}
        >
          {pane.label}
        </h2>
        <p className="text-sm text-muted-foreground">{pane.description}</p>
      </div>
      {children}
    </section>
  )
}
