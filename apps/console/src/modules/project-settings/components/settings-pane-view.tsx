import { useId, type JSX, type ReactNode } from 'react'

import type { SettingsPane } from '@/modules/project-settings/components/settings-panes'
import { cn } from '@/shared/lib/utils'

type SettingsPaneViewProps = {
  pane: SettingsPane
  children: ReactNode
}

/** The open pane: its title and one line, then its panels. */
export function SettingsPaneView({ pane, children }: SettingsPaneViewProps): JSX.Element {
  const titleId = useId()

  return (
    <section
      key={pane.id}
      aria-labelledby={titleId}
      className="flex min-w-0 animate-page-in flex-col gap-4"
    >
      <div className="grid gap-0.5">
        <h2
          id={titleId}
          className={cn('text-base font-medium', pane.isDanger === true && 'text-destructive')}
        >
          {pane.label}
        </h2>
        <p className="text-xs text-muted-foreground">{pane.description}</p>
      </div>
      {children}
    </section>
  )
}
