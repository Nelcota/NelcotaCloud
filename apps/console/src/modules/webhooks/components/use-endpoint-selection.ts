import { useLocation, useNavigate } from '@tanstack/react-router'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'

export type EndpointSelection = {
  /** The endpoint named in the URL hash, or the first one; `null` while there are none. */
  selectedId: string | null
  select: (endpointId: string) => void
}

/** The open endpoint lives in the URL hash (`#<id>`), so a reload or a shared link keeps it. */
export function useEndpointSelection(
  endpoints: readonly WebhookEndpoint[] | undefined,
): EndpointSelection {
  const hash = useLocation({ select: (location) => location.hash })
  const navigate = useNavigate()

  function select(endpointId: string): void {
    void navigate({ to: '.', hash: endpointId, replace: true, resetScroll: false })
  }

  return { selectedId: selectedIdOf(endpoints, hash), select }
}

/** A deleted or unknown id falls back to the first endpoint. */
function selectedIdOf(
  endpoints: readonly WebhookEndpoint[] | undefined,
  hash: string,
): string | null {
  if (endpoints === undefined) {
    return null
  }

  const named = endpoints.find((endpoint) => endpoint.id === hash)

  return named?.id ?? endpoints.at(0)?.id ?? null
}
