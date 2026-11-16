import { createLazyRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/modules/project-settings/pages/settings-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const settingsLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/settings')({
  component: SettingsPage,
})
