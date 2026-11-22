import { useLocation } from '@tanstack/react-router'

import {
  paneFromHash,
  type SettingsPane,
} from '@/modules/project-settings/components/settings-panes'

/** The open pane lives in the URL hash, so it survives a reload and can be linked. */
export function useSettingsPane(): SettingsPane {
  const hash = useLocation({ select: (location) => location.hash })

  return paneFromHash(hash)
}
