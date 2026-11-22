import type { JSX } from 'react'

import { SettingsNavGroupLabel } from '@/modules/project-settings/components/settings-nav-group-label'
import { SettingsNavItem } from '@/modules/project-settings/components/settings-nav-item'
import {
  DANGER_PANE,
  panesOf,
  SETTINGS_PANE_GROUPS,
  SETTINGS_PANES,
  type SettingsPane,
} from '@/modules/project-settings/components/settings-panes'
import { SettingsShortcutList } from '@/modules/project-settings/components/settings-shortcut-list'

type SettingsNavProps = {
  projectId: string
  current: SettingsPane
}

/** Labeled groups beside the content on wide screens, a row of scrolling pills on narrow ones. */
export function SettingsNav({ projectId, current }: SettingsNavProps): JSX.Element {
  return (
    <>
      <SettingsPills current={current} />
      <SettingsSidebar projectId={projectId} current={current} />
    </>
  )
}

function SettingsPills({ current }: { current: SettingsPane }): JSX.Element {
  return (
    <nav aria-label="Configurações" className="min-w-0 lg:hidden">
      <ul className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        {SETTINGS_PANES.map((pane) => (
          <li key={pane.id} className="shrink-0">
            <SettingsNavItem pane={pane} isCurrent={pane.id === current.id} look="pill" />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SettingsSidebar({ projectId, current }: SettingsNavProps): JSX.Element {
  return (
    <nav
      aria-label="Configurações"
      className="hidden min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:flex lg:self-start"
    >
      {SETTINGS_PANE_GROUPS.map((group) => (
        <div key={group.id} className="grid gap-px">
          <SettingsNavGroupLabel id={`settings-group-${group.id}`} label={group.label} />
          <ul aria-labelledby={`settings-group-${group.id}`} className="grid gap-px">
            {panesOf(group.id).map((pane) => (
              <li key={pane.id}>
                <SettingsNavItem pane={pane} isCurrent={pane.id === current.id} look="sidebar" />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <SettingsShortcutList projectId={projectId} />
      <div className="mt-2 border-t border-border/60 pt-3">
        <SettingsNavItem
          pane={DANGER_PANE}
          isCurrent={DANGER_PANE.id === current.id}
          look="sidebar"
        />
      </div>
    </nav>
  )
}
