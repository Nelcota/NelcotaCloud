import { Tabs as TabsPrimitive } from 'radix-ui'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type WebhookTabPanelProps = { value: string; children: ReactNode; className?: string }

/** One tab's content, kept mounted while hidden so a draft survives a look at another tab. */
export function WebhookTabPanel({ value, children, className }: WebhookTabPanelProps): JSX.Element {
  return (
    <TabsPrimitive.Content
      value={value}
      forceMount
      className={cn('flex min-w-0 flex-col gap-4 data-[state=inactive]:hidden', className)}
    >
      {children}
    </TabsPrimitive.Content>
  )
}
