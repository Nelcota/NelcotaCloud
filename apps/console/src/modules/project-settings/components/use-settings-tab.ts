import { useLocation, useNavigate } from '@tanstack/react-router'

import {
  settingsTabOf,
  type SettingsTabId,
} from '@/modules/project-settings/components/settings-tabs'

export type SettingsTabSelection = {
  tab: SettingsTabId
  select: (value: string) => void
}

/** The open tab lives in the URL hash (`#seguranca`), so a reload or a shared link keeps it. */
export function useSettingsTab(): SettingsTabSelection {
  const hash = useLocation({ select: (location) => location.hash })
  const navigate = useNavigate()

  function select(value: string): void {
    void navigate({ to: '.', hash: settingsTabOf(value), replace: true, resetScroll: false })
  }

  return { tab: settingsTabOf(hash), select }
}
