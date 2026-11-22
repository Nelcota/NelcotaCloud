import { Tabs as TabsPrimitive } from 'radix-ui'
import type { JSX, ReactNode } from 'react'

/** The panels of one account tab, stacked; the tab list names it. */
export function AccountTabPanel({
  value,
  children,
}: {
  value: string
  children: ReactNode
}): JSX.Element {
  return (
    <TabsPrimitive.Content
      value={value}
      className="flex min-w-0 flex-col gap-4 outline-none data-[state=active]:animate-page-in"
    >
      {children}
    </TabsPrimitive.Content>
  )
}
