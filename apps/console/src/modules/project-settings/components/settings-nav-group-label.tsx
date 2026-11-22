import type { JSX } from 'react'

/** The uppercase label over a group of the settings sidebar. */
export function SettingsNavGroupLabel({ id, label }: { id: string; label: string }): JSX.Element {
  return (
    <p id={id} className="type-label px-2 pt-1 pb-1.5 text-muted-foreground">
      {label}
    </p>
  )
}
