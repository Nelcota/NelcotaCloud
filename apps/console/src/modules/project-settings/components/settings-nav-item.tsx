import { useEffect, useRef, type JSX } from 'react'

import type { SettingsPane } from '@/modules/project-settings/components/settings-panes'
import { cn } from '@/shared/lib/utils'

type SettingsNavItemProps = {
  pane: SettingsPane
  isCurrent: boolean
}

export function SettingsNavItem({ pane, isCurrent }: SettingsNavItemProps): JSX.Element {
  const Glyph = pane.icon
  const link = useRef<HTMLAnchorElement>(null)

  // On narrow screens the tabs scroll sideways; keep the open one in sight after a reload.
  useEffect(() => {
    if (isCurrent === false) {
      return
    }

    link.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isCurrent])

  return (
    <a
      ref={link}
      href={`#${pane.id}`}
      aria-current={currentOf(isCurrent)}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap text-muted-foreground transition-[color,background-color,scale] outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:active:scale-100',
        isCurrent && 'bg-surface font-medium text-heading',
        isCurrent && pane.isDanger === true && 'text-destructive',
      )}
    >
      <Glyph
        aria-hidden
        className={cn('size-4 shrink-0', pane.isDanger === true && 'text-destructive')}
      />
      {pane.label}
    </a>
  )
}

function currentOf(isCurrent: boolean): 'page' | undefined {
  if (isCurrent === false) {
    return undefined
  }

  return 'page'
}
