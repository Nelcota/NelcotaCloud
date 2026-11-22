import type { JSX } from 'react'

import {
  CreateEndpointButton,
  type EndpointCreator,
} from '@/modules/webhooks/components/create-endpoint-button'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'

type HeaderCreateActionProps = {
  /** `undefined` while loading or after a failed load. */
  endpoints: readonly WebhookEndpoint[] | undefined
  creator: EndpointCreator
}

/** The header's add button; an empty project shows it in the empty state instead, only once. */
export function HeaderCreateAction({
  endpoints,
  creator,
}: HeaderCreateActionProps): JSX.Element | null {
  // Hidden while loading too: an empty list shows its own form, so the button would blink.
  if (endpoints === undefined || endpoints.length === 0) {
    return null
  }

  return <CreateEndpointButton creator={creator} />
}
