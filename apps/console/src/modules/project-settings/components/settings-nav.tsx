import type { JSX } from 'react'

import { SettingsNavItem } from '@/modules/project-settings/components/settings-nav-item'
import {
  SETTINGS_PANES,
  type SettingsPane,
} from '@/modules/project-settings/components/settings-panes'
import { SettingsShortcutList } from '@/modules/project-settings/components/settings-shortcut-list'

type SettingsNavProps = {
  projectId: string
  current: SettingsPane
}

/** A column of panes beside the content on wide screens, a scrolling tab row on narrow ones. */
export function SettingsNav({ projectId, current }: SettingsNavProps): JSX.Element {
  return (
    <nav aria-label="Configurações" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
      <ul className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:border-0 lg:px-0 lg:pb-0">
        {SETTINGS_PANES.map((pane) => (
          <li key={pane.id} className="shrink-0">
            <SettingsNavItem pane={pane} isCurrent={pane.id === current.id} />
          </li>
        ))}
      </ul>
      <SettingsShortcutList projectId={projectId} />
    </nav>
  )
}
