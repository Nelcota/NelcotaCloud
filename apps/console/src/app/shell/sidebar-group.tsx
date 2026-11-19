import type { JSX, ReactNode } from 'react'
import { useId } from 'react'

type SidebarGroupProps = {
  /** Shown as the group's heading; `null` for the first group, which sits under the title. */
  label: string | null
  children: ReactNode
}

/** A titled run of sidebar rows, spaced apart from the next group. */
export function SidebarGroup({ label, children }: SidebarGroupProps): JSX.Element {
  const headingId = useId()

  if (label === null) {
    return <div className="grid gap-0.5">{children}</div>
  }

  return (
    <section aria-labelledby={headingId} className="grid gap-0.5">
      <h2 id={headingId} className="text-foreground px-3 pt-4 pb-1.5 text-sm font-semibold">
        {label}
      </h2>
      {children}
    </section>
  )
}
