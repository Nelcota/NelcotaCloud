import ArrowUpRight from '~icons/solar/arrow-right-up-linear'
import type { JSX } from 'react'

import { SETTINGS_SHORTCUTS } from '@/modules/project-settings/components/settings-shortcuts'
import { RouterLink } from '@/shared/routing/router-link'

/** Settings with a page of their own; only beside the panes, the sidebar already lists them. */
export function SettingsShortcutList({ projectId }: { projectId: string }): JSX.Element {
  return (
    <div className="mt-6 hidden gap-1 lg:grid">
      <h2 className="px-2.5 text-xs font-medium text-muted-foreground">Mais</h2>
      <ul className="grid gap-0.5">
        {SETTINGS_SHORTCUTS.map((shortcut) => {
          const Glyph = shortcut.icon

          return (
            <li key={shortcut.segment}>
              <RouterLink
                href={`/projects/${projectId}/${shortcut.segment}`}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-[color,background-color,scale] outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:active:scale-100"
              >
                <Glyph aria-hidden className="size-4 shrink-0" />
                <span className="flex-1">{shortcut.label}</span>
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100"
                />
              </RouterLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
