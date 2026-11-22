import { ArrowUpRight } from 'lucide-react'
import type { JSX } from 'react'

import { SettingsNavGroupLabel } from '@/modules/project-settings/components/settings-nav-group-label'
import { SETTINGS_SHORTCUTS } from '@/modules/project-settings/components/settings-shortcuts'
import { RouterLink } from '@/shared/routing/router-link'

const LABEL_ID = 'settings-group-shortcuts'

/** Settings with a page of their own; only in the wide sidebar, the project sidebar lists them too. */
export function SettingsShortcutList({ projectId }: { projectId: string }): JSX.Element {
  return (
    <div className="grid gap-px">
      <SettingsNavGroupLabel id={LABEL_ID} label="Outras páginas" />
      <ul aria-labelledby={LABEL_ID} className="grid gap-px">
        {SETTINGS_SHORTCUTS.map((shortcut) => {
          const Glyph = shortcut.icon

          return (
            <li key={shortcut.segment}>
              <RouterLink
                href={`/projects/${projectId}/${shortcut.segment}`}
                className="group flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-[color,background-color,scale] duration-200 ease-standard outline-none hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <Glyph aria-hidden className="size-4 shrink-0" />
                <span className="flex-1 truncate">{shortcut.label}</span>
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </RouterLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
