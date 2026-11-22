import { createLazyRoute } from '@tanstack/react-router'

import { WebhookDetailPage } from '@/modules/webhooks/pages/webhook-detail-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const webhookDetailLazyRoute = createLazyRoute(
  '/_authenticated/projects/$projectId/webhooks/$endpointId',
)({
  component: WebhookDetailPage,
})
