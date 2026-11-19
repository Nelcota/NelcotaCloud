import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { JSX, ReactNode } from 'react'

type TabsProps = {
  value: string
  /** The newly picked tab's value; the caller maps it back to its own type. */
  onChange: (value: string) => void
  children: ReactNode
}

/** Switches between parts of one page; the open part is controlled (usually from the URL). */
export function Tabs({ value, onChange, children }: TabsProps): JSX.Element {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(next) => onChange(String(next))}
      className="grid gap-6"
    >
      {children}
    </TabsPrimitive.Root>
  )
}

type TabListProps = { label: string; children: ReactNode }

/** The row of tabs, on a hairline the open tab's underline sits on. */
export function TabList({ label, children }: TabListProps): JSX.Element {
  return (
    <TabsPrimitive.List
      aria-label={label}
      className="flex gap-4 overflow-x-auto border-b [scrollbar-width:none] sm:gap-6"
    >
      {children}
    </TabsPrimitive.List>
  )
}

type TabProps = {
  value: string
  children: ReactNode
  /** How many items the tab holds; hidden at zero, like the sidebar counts. */
  count?: number
  /** Something on the tab is unsaved: a dot, and the words for screen readers. */
  isMarked?: boolean
}

/** One tab: muted until open, then in the foreground colour with a 2px underline (never mint). */
export function Tab({ value, children, count, isMarked }: TabProps): JSX.Element {
  return (
    <TabsPrimitive.Tab
      value={value}
      className="text-muted-foreground hover:text-foreground data-[active]:text-foreground after:bg-foreground relative -mx-1 flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:opacity-0 data-[active]:after:opacity-100"
    >
      {children}
      <TabCount count={count} />
      <UnsavedMark isMarked={isMarked === true} />
    </TabsPrimitive.Tab>
  )
}

function TabCount({ count }: { count?: number }): JSX.Element | null {
  if (count === undefined || count === 0) {
    return null
  }

  return (
    <span className="bg-foreground/8 rounded-md px-1.5 text-xs leading-5 tabular-nums">
      {count.toLocaleString('pt-BR')}
    </span>
  )
}

function UnsavedMark({ isMarked }: { isMarked: boolean }): JSX.Element | null {
  if (isMarked === false) {
    return null
  }

  return (
    <>
      <span aria-hidden="true" className="bg-foreground size-1.5 rounded-full" />
      <span className="sr-only">(não salvo)</span>
    </>
  )
}

type TabPanelProps = {
  value: string
  children: ReactNode
  /** Keeps the panel (and what was typed in it) while another tab is open. */
  keepsDraft?: boolean
}

export function TabPanel({ value, children, keepsDraft }: TabPanelProps): JSX.Element {
  return (
    <TabsPrimitive.Panel
      value={value}
      keepMounted={keepsDraft}
      className="focus-visible:ring-ring/50 min-w-0 rounded-xl focus-visible:ring-3 focus-visible:outline-none"
    >
      {children}
    </TabsPrimitive.Panel>
  )
}
