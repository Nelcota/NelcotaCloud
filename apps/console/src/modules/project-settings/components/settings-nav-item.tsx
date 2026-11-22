import { useEffect, useRef, type JSX } from 'react'

import type { SettingsPane } from '@/modules/project-settings/components/settings-panes'
import { cn } from '@/shared/lib/utils'

export type SettingsNavLook = 'sidebar' | 'pill'

type SettingsNavItemProps = {
  pane: SettingsPane
  isCurrent: boolean
  /** A row of the sidebar on wide screens, a scrolling pill on narrow ones. */
  look: SettingsNavLook
}

const LOOKS: Record<SettingsNavLook, string> = {
  sidebar: 'h-8 px-2 text-sm',
  pill: 'h-7 px-2.5 text-xs',
}

export function SettingsNavItem({ pane, isCurrent, look }: SettingsNavItemProps): JSX.Element {
  const Glyph = pane.icon
  const link = useRef<HTMLAnchorElement>(null)
  const isDanger = pane.isDanger === true

  // The pills scroll sideways; keep the open one in sight after a reload.
  useEffect(() => {
    if (isCurrent === false || look === 'sidebar') {
      return
    }

    link.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isCurrent, look])

  return (
    <a
      ref={link}
      href={`#${pane.id}`}
      aria-current={currentOf(isCurrent)}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-md whitespace-nowrap text-muted-foreground transition-[color,background-color,scale] duration-200 ease-standard outline-none hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.97] motion-reduce:active:scale-100',
        LOOKS[look],
        isCurrent && 'bg-surface-hover font-medium text-foreground hover:bg-surface-hover',
        isDanger && 'text-destructive hover:text-destructive',
      )}
    >
      <Glyph
        aria-hidden
        className={cn(
          'size-4 shrink-0 transition-colors',
          isCurrent && 'text-brand',
          isDanger && 'text-destructive',
        )}
      />
      <span className="truncate">{pane.label}</span>
    </a>
  )
}

function currentOf(isCurrent: boolean): 'page' | undefined {
  if (isCurrent === false) {
    return undefined
  }

  return 'page'
}
