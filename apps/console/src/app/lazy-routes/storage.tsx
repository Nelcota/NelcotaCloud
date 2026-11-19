import { createLazyRoute } from '@tanstack/react-router'

import { StoragePage } from '@/modules/storage/pages/storage-page'

export const storageLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/storage')({
  component: StoragePage,
})
