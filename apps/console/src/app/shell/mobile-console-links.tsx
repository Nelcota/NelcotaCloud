import type { JSX } from 'react'

import type { ConsoleSection } from '@/app/shell/console-sections'
import { CONSOLE_SECTIONS } from '@/app/shell/console-sections'
import { ariaCurrentPage } from '@/shared/lib/aria-current'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'

type MobileConsoleLinksProps = { current: ConsoleSection | undefined }

/** The rail's places as named rows: on touch there is no hover to reveal an icon's name. */
export function MobileConsoleLinks({ current }: MobileConsoleLinksProps): JSX.Element {
  return (
    <nav aria-label="Console" className="grid gap-px border-b px-2 py-2">
      {CONSOLE_SECTIONS.map((section) => {
        const Glyph = section.icon
        const isCurrent = section === current

        return (
          <RouterLink
            key={section.path}
            href={section.path}
            aria-current={ariaCurrentPage(isCurrent)}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-surface hover:text-foreground',
              isCurrent && 'bg-surface-hover font-medium text-foreground',
            )}
          >
            <Glyph aria-hidden className={cn('size-4 shrink-0', isCurrent && 'text-brand')} />
            {section.label}
          </RouterLink>
        )
      })}
    </nav>
  )
}
