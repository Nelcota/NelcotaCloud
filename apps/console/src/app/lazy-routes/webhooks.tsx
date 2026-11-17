import { createLazyRoute } from '@tanstack/react-router'

import { WebhooksPage } from '@/modules/webhooks/pages/webhooks-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const webhooksLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/webhooks')({
  component: WebhooksPage,
})
