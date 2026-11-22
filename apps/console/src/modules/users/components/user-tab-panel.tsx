import { Tabs as TabsPrimitive } from 'radix-ui'
import type { JSX, ReactNode } from 'react'

type UserTabPanelProps = { value: string; children: ReactNode }

/**
 * One tab's content. Kept mounted while hidden, so an unsaved metadata draft survives a look at
 * another tab.
 */
export function UserTabPanel({ value, children }: UserTabPanelProps): JSX.Element {
  return (
    <TabsPrimitive.Content
      value={value}
      forceMount
      className="flex flex-col gap-4 pt-4 data-[state=inactive]:hidden"
    >
      {children}
    </TabsPrimitive.Content>
  )
}
